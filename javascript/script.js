
window.onload = function() {
    loadTasks();  // Fetch tasks from backend when the page loads
  };
       
// Get modal, buttons, and form elements
const modal = document.getElementById('modal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const contactForm = document.getElementById('taskForm');

// Open modal
openModalBtn.onclick = function() {
    modal.style.display = "block";
}

// Close modal when clicking 'X' button
closeModalBtn.onclick = function() {
    modal.style.display = "none";
}

// Close modal when clicking outside the modal content
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

// Handle form submission (you can add more functionality here, like validation)
contactForm.onsubmit = function(event) {
    event.preventDefault(); // Prevent form submission to server for now

    console.log("Form Submitted", { title, description, deadline,priority});

    // Optionally, you can close the modal after submission
    modal.style.display = "none";
}

 

  // Function to load tasks
  function loadTasks() {
    fetch('/tasks')  // Make an API request to the /tasks endpoint
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        return response.json();  // Parse the JSON response
      })
      .then(tasks => {
        const tableBody = document.querySelector('#tasksTable tbody');  // Get the table body
        
        if (tasks.length === 0) {
          tableBody.innerHTML = "<tr><td colspan='5'>No tasks found.</td></tr>";
          return;
        }

        // Create table rows for each task
        const tableRows = tasks.map(task => `
          <tr>
            <td>${task.title}</td>
            <td>${task.description}</td>
            <td>${task.deadline}</td>
            <td>${getPriorityText(task.priority)}</td>
            <td>
              <button class="ui red button" onclick="deleteTask(${task.id})">Delete</button>
            </td>
          </tr>
        `).join('');

        // Insert rows into the table body
        tableBody.innerHTML = tableRows;
      })
      .catch(error => {
        console.error('Error loading tasks:', error);
        alert('Failed to load tasks');
      });
  }

  // Function to get priority text
  function getPriorityText(priority) {
    switch (priority) {
      case 1:
        return 'High Priority';
      case 2:
        return 'Medium Priority';
      case 3:
        return 'Low Priority';
      default:
        return 'Unknown';
    }
  }

  // Placeholder function for deleting tasks (you can implement this further)
  function deleteTask(taskId) {
    console.log(`Delete task with ID: ${taskId}`);
    // Call API to delete the task from the database or local data
  }

