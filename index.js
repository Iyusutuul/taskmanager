
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const http = require('http');
const dotenv = require ('dotenv');
const socketIo = require('socket.io');

const app = express();
const port = 3000;

require("dotenv").config({
    path: path.resolve(__dirname, '../../../.env')
  });
//.env configurations
dotenv.config({path: './.env'})  
// Database connection
const pool = require('./lib/dbConfig')

app.use(session({
    secret: 'secret',
    secure: true,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 3600000}
}));



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
    
        const validEmail = "dahel@gmail.com";
        const validPassword = "root";
    
        if (email && password) {
            if (email === validEmail && password === validPassword) {
                req.session.loggedin = true;
                req.session.userId = 1;  // You can assign any user ID or fetch from DB if needed
                req.session.user = { id: 1, email: validEmail }; // Store user data in session
                req.session.email = validEmail;
    
                console.log('User logged in:', req.session.user);
    
                // Generate default tasks for the user
                const defaultTasks = [
                    { title: 'Complete registration', description: 'Fill out your profile details.', userId: 1, completed: false },
                    { title: 'Start a new project', description: 'Create a new task for the upcoming project.', userId: 1, completed: false },
                    { title: 'Review meeting notes', description: 'Go through the notes from the last team meeting.', userId: 1, completed: false },
                ];
    
                // Insert default tasks into the database
                defaultTasks.forEach(task => {
                    pool.query(
                        'INSERT INTO tasks (title, description, user_id, completed) VALUES ($1, $2, $3, $4)',
                        [task.title, task.description, task.userId, task.completed],
                        (err, result) => {
                            if (err) {
                                console.error('Error inserting default tasks:', err);
                            }
                        }
                    );
                });
    
                // Redirect to task manager page after login
                res.redirect('/taskmgr.html');
            } else {
                res.redirect('/login.html?error=incorrect');
            }
        } else {
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
// Fetch task details by ID (for editing)
app.get('/tasks/:id', async (req, res) => {
    const taskId = req.params.id; // Get task ID from the URL
    console.log(taskId);

    // Query to fetch the task from the database
    const query = 'SELECT * FROM tasks WHERE id = $1';
    
    try {
        const result = await pool.query(query, [taskId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result.rows[0]); // Return the task as JSON
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// PUT endpoint to update a task
app.put('/tasks/:id', async (req, res) => {
    const taskId = req.params.id; // Get task ID from the URL parameter
    const { title, description, deadline, priority } = req.body; // Get updated task data from the request body

    // SQL query to update task details in the database
    const query = `
        UPDATE tasks
        SET title = $1, description = $2, deadline = $3, priority = $4
        WHERE id = $5
        RETURNING *`; // Returning the updated task

    try {
        // Execute the query with the provided values
        const result = await client.query(query, [title, description, deadline, priority, taskId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Task not found' }); // Handle task not found
        }

        const updatedTask = result.rows[0]; // Get the updated task

        // Send the updated task data back as a JSON response
        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal server error' }); // Handle server errors
    }
});



// Handle adding a task
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

    const query = `INSERT INTO tasks (title, description, deadline, priority, user_id) VALUES ($1, $2, $3, $4, $5)`;
    const values = [title, description, deadlineDate, priority, userId];

    try {
        const result = await pool.query(query, values);

        // If the insert was successful
        if (result.rowCount > 0) {
            // Emit the new task to all connected clients
            io.emit('new-task', { title, description, deadline: deadlineDate, priority });

            res.status(201).json({
                message: 'Task added successfully!',
                task: { title, description, deadline: deadlineDate, priority }
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
