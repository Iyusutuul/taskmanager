$(document).ready(function () {
    // Initialize the dropdown (if needed for priority selection)
    $('#priority-dropdown').dropdown();
});

/// Open and populate the modal for editing a task
function editTask(taskId) {
    console.log('Edit task triggered for ID:', taskId); // Debugging line

    // Fetch task data from the backend using your correct endpoint
    fetch(`/tasks/${taskId}`)  // Correct endpoint to fetch task details
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(task => {
            console.log('Fetched task data:', task); // Debugging line

            // Populate the form fields with the fetched task data
            $('#title').val(task.title);
            $('#description').val(task.description);
            $('#deadline').val(task.deadline.split('T')[0]); // Convert date to correct format
            $('#priority').val(task.priority); // Set priority in dropdown
            $('#taskId').val(task.id); // Set task ID in hidden field

            // Update the form action and method for editing
            $('#taskForm').attr('action', `/tasks/${taskId}`); // Correct PUT endpoint for editing
            $('#taskForm').attr('method', 'PUT');
            $('#submitBtn').text('Update Task'); // Change button text to "Update Task"
            $('#modal').fadeIn(); // Show the modal
        })
        .catch(error => {
            console.error('Error fetching task:', error);
            alert('Error fetching task details');
        });
}


// Close the modal
$('#closeModalBtn').click(function () {
    $('#modal').fadeOut();
    $('#taskForm')[0].reset();  // Reset the form
});

// Close modal if clicking outside the modal area
$(window).click(function (event) {
    if ($(event.target).is('#modal')) {
        $('#modal').fadeOut();
        $('#taskForm')[0].reset(); // Reset the form when closing
    }
});
   
