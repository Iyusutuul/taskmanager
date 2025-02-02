
window.onload = function () {
    loadTasks();  // Fetch tasks from backend when the page loads
};
$(document).ready(function () {
    // Ensure form submission is intercepted and handled via AJAX
    $('#editForm').submit(function (e) {
        e.preventDefault(); // Prevent the default form submission (this is key!)

        // Get the task ID from the form
        const taskId = $('#taskId').val(); // Assuming you are storing the task ID in a hidden input field with id 'taskId'

        // Manually collect the form data
        const formData = {
            title: $('#editTitle').val(),
            description: $('#editDescription').val(),
            deadline: $('#editDeadline').val(),
            priority: $('#editPriority').val(),
            taskId: taskId
        };

        // Make the AJAX call to submit the form data
        $.ajax({
            type: 'PUT',
            url: `/update-tasks/${taskId}`,  // Dynamically include the task ID in the URL
            data: formData,
            success: function(response) {
                console.log('Server response:', response); // Log the full response
                // Check if the response contains tasks
                if (response.tasks) {
                    updateTaskList(response.tasks);
                } else {
                    console.error('Error: No tasks returned.');
                    alert('Updated successfully');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
                alert('There was an error updating the task. Please try again.');
            }
        });
    });

  // Function to update the task list dynamically in the table
  function updateTaskList(tasks) {
    const tasksTableBody = $('#tasksTable tbody');
    tasksTableBody.empty();  // Clear the existing rows

    // Loop through the tasks and append them to the table
    tasks.forEach(function(task) {
        tasksTableBody.append(`
            <tr>
                <td>${task.title}</td>
                <td>${task.description}</td>
                <td>${new Date(task.deadline).toLocaleDateString()}</td>
                <td>${task.priority === 1 ? 'High' : task.priority === 2 ? 'Medium' : 'Low'}</td>
                <td>
    <div class="button-container">
        <button class="editBtn" onclick="editTask(${task.id})">Edit</button>
        <button class="deleteBtn" onclick="deleteTask(${task.id})"><i class="fa fa-trash" aria-hidden="true"></i></button>
    </div>
</td>`
        );
    });
}
});


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



const errorType = urlParams.get('error');

// Open the modal for editing a task
function editTask(taskId) {
  // Fetch task data from the backend
  fetch(`/tasks/${taskId}`)
      .then(response => response.json())
      .then(task => {
          // Populate the form with task data
          document.getElementById('editTitle').value = task.title;
          document.getElementById('editDescription').value = task.description;
          document.getElementById('editDeadline').value = task.deadline.split('T')[0]; // Adjust if deadline is in ISO format
          document.getElementById('editPriority').value = task.priority;
          document.getElementById('taskId').value = task.id;

          // Change the form action and method for update
     
          document.getElementById('editForm').action = `/update-tasks/${taskId}`; // Correct URL format
          document.getElementById('editForm').method = 'PUT'; // Use PUT for updates

      // Show the modal
      document.getElementById('editModal').style.display = 'flex'; // Use 'flex' to display it

      // Close Search Modal
      $('#closeEditBtn').click(function () {
    $('#editModal').fadeOut();
});

// Close modal if clicking outside the modal
window.onclick = function(event) {
  if (event.target === document.getElementById('editModal')) {
      document.getElementById('editModal').style.display = 'none';
  }
}
      })
      .catch(error => console.error('Error fetching task:', error));
}


