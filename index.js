const express = require('express');
require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const port = 3000;

const server = http.createServer(app);
const io = socketIo(server);  // Initialize socket.io

app.use(session({
    secret: 'secret',
    secure: true,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 3600000}
}));

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'taskmanager',
//     password: 'Huaweiy9@',
//     port: 5432,
// });

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
      rejectUnauthorized: false, // Adjust this if you have specific SSL certs
    },
  });
  
  pool.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Database connection error:', err.stack));

// // Connect to the PostgreSQL database
// pool.connect((err) => {
//     if (err) {
//         console.error('Database connection error:', err.stack);
//     } else {
//         console.log('Connected to the database');
//     }
// });

// Middleware to parse JSON bodies and static files
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));

app.get("/", (req,res) =>{
    res.sendFile(path.resolve(__dirname, 'public', 'login.html'));  // Serve the HTML page
    });

app.post("/", (req, res) => {
    const { email, password } = req.body;

    if (email && password) {
        // Query the database to get the user with the provided email
        pool.query('SELECT * FROM users WHERE email = $1', [email], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal Server Error');
            }

            if (result.rows.length > 0) {
                const user = result.rows[0];

                // Compare the entered password with the stored bcrypt hash
                bcrypt.compare(password, user.password, (err, match) => {
                    if (err) {
                        console.error('Error comparing password:', err);
                        return res.status(500).send('Internal Server Error');
                    }

                    if (match) {
                        // Passwords match, proceed with login
                        req.session.loggedin = true;
                        req.session.userId = user.id;
                        req.session.user = user;
                        req.session.email = email;
                        console.log('User logged in:', req.session.user);

                        // Redirect to task manager page after login
                        res.redirect('/taskmgr.html');
                    } else {
                        // If passwords don't match, redirect with error query parameter
                        res.redirect('/login.html?error=incorrect');
                    }
                });
            } else {
                // If user is not found, redirect with error query parameter
                res.redirect('/login.html?error=usernotfound');
            }
        });
    } else {
        // If email or password is missing, redirect with error query parameter
        res.redirect('/login.html?error=missingcredentials');
    }
});

app.get('/tasks', (req, res) => {
    // Check if there's a search query in the URL parameters
    const searchQuery = req.query.query;

    let sqlQuery = 'SELECT * FROM tasks WHERE user_id = $1';
    let queryParams = [req.session.userId]; // Always filter by user_id

    if (searchQuery && searchQuery.length > 0) {
        // If there's a search query, add the filtering condition for the title and description
        sqlQuery += ' AND (title ILIKE $2 OR description ILIKE $2)';
        queryParams.push(`%${searchQuery}%`); // Use ILIKE for case-insensitive search
    }

    // Run the query
    pool.query(sqlQuery, queryParams, (error, result) => {
        if (error) {
            console.error('Error occurred:', error);
            return res.status(500).send('An error occurred while retrieving data from the database.');
        }

        const tasks = result.rows;
        res.json(tasks);  // Return the tasks (filtered by search query, if applicable)
    });
});
    
app.get("/signup",(req,res)=>{
res.sendFile(path.resolve(__dirname, 'public', 'signup.html'));  // Serve the signup page
});

app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;

    let message = '';
    let message_success = '';

    // Check if email already exists in the database
    pool.query('SELECT email FROM users WHERE email = $1', [email], async (error, result) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Internal Server Error');
        }

        if (result.rows.length > 0) {
            message = 'Email is already in use';
            return res.redirect('/signup.html?error=match');  // Render signup page with error message
        };

        // Hash password before storing it
        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Insert new user into the database
            pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', 
                [name, email, hashedPassword], (error, result) => {
                    if (error) {
                        console.log(error);
                        return res.status(500).send('Internal Server Error');
                    } else {
                        message_success = 'Registration Successful, Please Login';
                        res.sendFile(path.join(__dirname,'public','login.html'));  // Render login page with success message
                    }
                });
        } catch (hashError) {
            console.log('Error hashing password:', hashError);
            return res.status(500).send('Error hashing password');
        }
    });
});



// DELETE a task by ID
app.delete('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
   pool.query(query, [taskId])
        .then(result => {
            if (result.rows.length > 0) {
                res.status(200).json({ success: true });
            } else {
                res.status(404).json({ success: false, message: 'Task not found' });
            }
        })
        .catch(err => {
            console.error('Error deleting task', err);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});
// Route for getting a task's data
app.get('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
    const userId = req.session.userId;

    try {
        const query = 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2';
        const values = [taskId, userId];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Task not found.' });
        }

        res.json(result.rows[0]); // Return the task data
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Error fetching task. Please try again later.' });
    }
});


app.put('/update-tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const { title, description, deadline, priority } = req.body;

        // Query to update the task in the database and return the updated task
        const result = await pool.query(
            'UPDATE tasks SET title = $1, description = $2, deadline = $3, priority = $4 WHERE id = $5 RETURNING *',
            [title, description, deadline, priority, taskId]
        );

        // Check if the task exists and was updated
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found or not updated' });
        }

        // Get the updated task
        const updatedTask = result.rows[0];

        // Send the updated task in the response
        res.json({
            success: true,
            updatedTask: updatedTask
        });
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Error updating task' });
    }
});




app.post("/success", async (req, res) => {
    const { title, description, deadline, priority } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ error: 'User is not authenticated. Please log in.' });
    }

    if (!title || !description || !deadline || !priority) {
        return res.status(400).json({ error: 'All fields (title, description, deadline, and priority) are required.' });
    }

    if (![1, 2, 3].includes(Number(priority))) {
        return res.status(400).json({ error: 'Priority must be a number: 1 (High), 2 (Medium), or 3 (Low).' });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ error: 'Invalid deadline date.' });
    }

    const query = `INSERT INTO tasks (title, description, deadline, priority, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const values = [title, description, deadlineDate, priority, userId];

    try {
        const result = await pool.query(query, values);

        if (result.rowCount > 0) {
            const newTask = result.rows[0]; // Get the newly added task

            // Emit the 'new-task' event to all connected clients (or the specific client)
            io.emit('new-task', newTask);

            // Fetch all tasks for the user and send the updated task list as JSON
            const tasksResult = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [userId]);

            // Send a JSON response with the updated task list
            res.json({
                message: 'Task added successfully!',
                tasks: tasksResult.rows
            });
        } else {
            res.status(400).json({ error: 'Failed to add task.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Error saving record. Please try again later.' });
    }
});



app.get('/search-tasks', async (req, res) => {
    const { query } = req.query; // Get search query from URL parameters
    if (!query) {
        return res.status(400).send('Search query is required');
    }
    try {
        // Query PostgreSQL to search tasks by title or description
        const result = await pool.query(
            `SELECT * FROM tasks WHERE title ILIKE $1 OR description ILIKE $1`,
            [`%${query}%`]
        );
        // Send the results as JSON
        res.json(result.rows);
    } catch (err) {
        console.error('Error querying the database', err);
        res.status(500).send('Server Error');
    }
});

app.get('/logout', (req, res) => {
    // Clear the session or any user-related data
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            // Redirect the user to a login page or any other appropriate page
            res.redirect('/');
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
