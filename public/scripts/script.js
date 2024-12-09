 // Function to load tasks
  function loadTasks() {
    const searchQuery = document.getElementById('searchQuery').value;
    const url = searchQuery ? `/tasks?query=${encodeURIComponent(searchQuery)}` : '/tasks';
    
    fetch(url)  // Fetch tasks from the backend
        .then(response => response.json())
        .then(tasks => {
            const taskTableBody = document.querySelector('#tasksTable tbody');
            taskTableBody.innerHTML = ''; // Clear any existing rows
            
            tasks.forEach(task => {
                const row = document.createElement('tr');
                
                // Create task data cells
                row.innerHTML = `
                    <td>${task.title}</td>
                    <td>${task.description}</td>
                    <td>${new Date(task.deadline).toLocaleDateString()}</td>
                    <td>${task.priority}</td>
                    <td>
                        <button class="editBtn" onclick="editTask(${task.id})">Edit</button>
                     <button onclick="deleteTask(${task.id})">
    <i class="fa fa-trash" aria-hidden="true"></i>
</button>

                    </td>
                `;
                
                taskTableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching tasks:', error));
}       

  // Function to get priority text
  function getPriorityText(priority) {
    switch (priority) {
      case 1:
        return 'High';
      case 2:
        return 'Medium';
      case 3:
        return 'Low';
      default:
        return 'Unknown';
    }
  }

  // Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add event listeners to each delete button
  document.querySelectorAll('#delete-btn').forEach(button => {
      button.addEventListener('click', function() {
          const taskId = this.getAttribute('data-id');  // Get the task ID from the button
          deleteTask(taskId);  // Call the delete function
      });
  });
});

function deleteTask(taskId) {
  if (confirm('Are you sure you want to delete this task?')) {
      fetch(`/tasks/${taskId}`, { method: 'DELETE' })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  alert('Task deleted');
                  loadTasks();  // Reload tasks after deletion
              } else {
                  alert('Error deleting task');
              }
          })
          .catch(error => console.error('Error deleting task:', error));
  }
}

// Listen for new task event
socket.on('new-task', (task) => {
  const taskTableBody = document.querySelector('#tasksTable tbody');
  const row = document.createElement('tr');
  
  row.innerHTML = `
      <td>${task.title}</td>
      <td>${task.description}</td>
      <td>${new Date(task.deadline).toLocaleDateString()}</td>
      <td>${task.priority}</td>
      <td>
           <button class="editBtn" onclick="editTask(${task.id})">Edit</button>
          <button onclick="deleteTask(${task.id})">
    <i class="fa fa-trash" aria-hidden="true"></i>
</button>

      </td>
  `;
  
  taskTableBody.appendChild(row);
});
const urlParams = new URLSearchParams(window.location.search);
const errorType = urlParams.get('error');

// Open the modal for editing a task
function editTask(taskId) {
  // Fetch task data from the backend
  fetch(`/tasks/${taskId}`)
      .then(response => response.json())
      .then(task => {
          // Populate the form with task data
          document.getElementById('title').value = task.title;
          document.getElementById('description').value = task.description;
          document.getElementById('deadline').value = task.deadline.split('T')[0]; // Adjust if deadline is in ISO format
          document.getElementById('priority').value = task.priority;
          document.getElementById('taskId').value = task.id;

          // Change the form action and method for update
          document.getElementById('taskForm').action = `/update-tasks/${task.id}`;
          document.getElementById('taskForm').method = 'PUT'; // Use PUT for updates

          // Show the modal
          document.getElementById('modal').style.display = 'flex'; // Use 'flex' to display it
      })
      .catch(error => console.error('Error fetching task:', error));
}

// Close the modal when clicking the 'X' button
document.getElementById('closeModalBtn').onclick = function() {
  document.getElementById('modal').style.display = 'none';
}

// Close modal if clicking outside the modal
window.onclick = function(event) {
  if (event.target === document.getElementById('modal')) {
      document.getElementById('modal').style.display = 'none';
  }
}
