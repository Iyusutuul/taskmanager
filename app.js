const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(session({
    secret: 'secret',
    secure: true,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000000}
}));


const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'taskmanager',
    password: 'Huaweiy9@',
    port: 5432,
});

// Connect to the PostgreSQL database
pool.connect((err) => {
    if (err) {
        console.error('Database connection error:', err.stack);
    } else {
        console.log('Connected to the database');
    }
});

// Middleware to parse JSON bodies and static files
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// Route to fetch tasks from the database and render the page
// app.get("/", async (req, res) => {
//     try {
//         const result = await client.query('SELECT * FROM tasks');
//         const tasks = result.rows;
//         // Serve HTML file with the data
//         res.sendFile(path.resolve(__dirname, 'public', 'taskmgr.html'));  // Serve the HTML page
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).send('Error retrieving tasks.');
//     }
// });

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
                            res.status(403).send('Incorrect email or password');
                        }
                    });
                } else {
                    res.status(404).send('User not found');
                }
            });
        } else {
            res.status(400).send('Email and password are required');
        }
    });
    
//     app.get('/tasks', async (req, res) => {
//     if (!req.session.loggedin) {
//         return res.status(401).json({ error: 'Unauthorized' });
//     }

//     try {
//         const result = await client.query('SELECT * FROM tasks ORDER BY deadline ASC');
//         res.json(result.rows);  // Send tasks as JSON response
//     } catch (error) {
//         console.error('Error fetching tasks:', error);
//         res.status(500).json({ error: 'Failed to fetch tasks' });
//     }
// });
app.get('/tasks', (req, res) => {
    const query = 'SELECT * FROM tasks';
  
    pool.query(query, (error, result) => {
      if (error) {
        console.error('Error occurred:', error);
        res.status(500).send('An error occurred while retrieving data from the database.');
      } else {
        const task = result.rows;
        res.json(task);
      }
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
            return res.render('signup', { message });  // Render signup page with error message
        }

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


app.delete('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;  // Get task ID from the URL params

    try {
        // Query to delete the task by id
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [taskId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Return success response
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// Route to handle adding tasks (POST)
app.post("/success", async (req, res) => {
    const { title, description, deadline, priority } = req.body;

    // Validate input
    if (!title || !description || !deadline || !priority) {
        return res.status(400).json({ error: 'All fields (title, description, deadline, and priority) are required.' });
    }

    // Ensure priority is a valid integer between 1 and 3
    if (![1, 2, 3].includes(Number(priority))) {
        return res.status(400).json({ error: 'Priority must be a number: 1 (High), 2 (Medium), or 3 (Low).' });
    }

    // Validate the deadline is a valid date
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ error: 'Invalid deadline date.' });
    }

    // PostgreSQL query to insert data into the tasks table
    const query = `
        INSERT INTO tasks (title, description, deadline, priority)
        VALUES ($1, $2, $3, $4);
    `;
    const values = [title, description, deadlineDate, priority];

    try {
        const result = await pool.query(query, values);
        
        // If the insert was successful
        if (result.rowCount > 0) {
            res.status(201).json({
                message: 'Task added successfully!',
                task: { title, description, deadline: deadlineDate, priority }
            });
        } else {
            // Handle case where no row was inserted (probably due to a conflict)
            res.status(400).json({ error: 'Failed to add task. Duplicate task or other conflict occurred.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Error saving record. Please try again later.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
