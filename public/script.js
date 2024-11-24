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
          <tr id="task-${task.id}">
            <td>${task.title}</td>
            <td>${task.description}</td>
            <td>${task.deadline}</td>
            <td>${getPriorityText(task.priority)}</td>
            <td>
              <button id="delete-btn"  class="ui red button" onclick="deleteTask(${task.id})">Delete</button>
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

// Function to delete a task
function deleteTask(taskId) {
  fetch(`/tasks/${taskId}`, {
    method: 'DELETE',  // Specify the HTTP DELETE method
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // If the delete is successful, remove the task from the UI
      const taskRow = document.getElementById(`task-${taskId}`);
      if (taskRow) {
        taskRow.remove();
      }
    } else {
      alert('Failed to delete task');
    }
  })
  .catch(error => console.error('Error:', error));
}

const urlParams = new URLSearchParams(window.location.search);
const errorType = urlParams.get('error');

