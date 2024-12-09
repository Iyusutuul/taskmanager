// $(document).ready(function () {
//     // Initialize the dropdown (if needed for priority selection)
//     $('#priority-dropdown').dropdown();
// });

// // Open and populate the modal for editing a task
// function editTask(taskId) {
//     console.log('Edit task triggered for ID:', taskId); // Debugging line

//     // Fetch task data from the backend using your correct endpoint
//     fetch(`/tasks/${taskId}`)  // Correct endpoint to fetch task details
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Network response was not ok');
//             }
//             return response.json();
//         })
//         .then(task => {
//             if (!task || !task.id) {
//                 throw new Error('Task data is invalid');
//             }
//             console.log('Fetched task data:', task); // Debugging line

//             // Populate the form fields with the fetched task data
//             $('#editTitle').val(task.title);
//             $('#editDescription').val(task.description);
//             $('#editDeadline').val(task.deadline.split('T')[0]); // Convert date to correct format
//             $('#editPriority').val(task.priority); // Set priority in dropdown
//             $('#taskId').val(task.id); // Set task ID in hidden field

//             // Update the form action and method for editing
//             $('#taskForm').attr('action', `/tasks/${taskId}`); // Correct PUT endpoint for editing
//             $('#taskForm').attr('method', 'PUT');
//             $('#submitBtn').text('#'); // Change button text to "Update Task"
//             $('#modal').fadeIn(); // Show the modal
//         })
//         .catch(error => {
//             console.error('Error fetching task:', error);
//             alert('Error fetching task details');
//         });
// }

// // After successfully updating the task, update the task in the table
// function updateTaskInTable(updatedTask) {
//     const taskRow = document.querySelector(`#task-${updatedTask.id}`);
    
//     // Ensure task row exists in the table
//     if (taskRow) {
//         taskRow.innerHTML = `
//             <td>${updatedTask.title}</td>
//             <td>${updatedTask.description}</td>
//             <td>${new Date(updatedTask.deadline).toLocaleDateString()}</td>
//             <td>${updatedTask.priority}</td>
//             <td>
//                 <button class="editBtn" onclick="editTask(${updatedTask.id})">Edit</button>
//                 <button class="deleteBtn" onclick="deleteTask(${updatedTask.id})">Delete</button>
//             </td>
//         `;
//     } else {
//         console.error('Task row not found for ID:', updatedTask.id);
//     }
// }

// // Close the modal
// $('#closeModalBtn').click(function () {
//     $('#modal').fadeOut();
//     $('#taskForm')[0].reset();  // Reset the form
// });

// // Close modal if clicking outside the modal area
// $(window).click(function (event) {
//     if ($(event.target).is('#modal')) {
//         $('#modal').fadeOut();
//         $('#taskForm')[0].reset(); // Reset the form when closing
//     }
// });
