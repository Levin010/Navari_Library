$(document).ready(function() {
    const currentYear = new Date().getFullYear();
    const startYear = 1800;

    const $dropdown = $('#publication_year');

    // Clear any existing options except "Select year"
    $dropdown.find('option:not([value=""])').remove();

    
    for (let year = currentYear; year >= startYear; year--) {
        $dropdown.append(
            $('<option>', {
                value: year,
                text: year
            })
        );
    }

    loadBooks();
    
    function loadBooks() {
        $.ajax({
            url: '/api/books/',
            type: 'GET',
            success: function(data) {
                $('#book-list').empty();
                
                if (data.length === 0) {
                    $('#book-list').append('<tr><td colspan="6" class="px-6 py-4 text-center">No books available</td></tr>');
                    return;
                }
                
                $.each(data, function(index, book) {
                    let coverImg = book.cover_pic 
                        ? `<img src="${book.cover_pic}" alt="${book.title}" class="h-12 w-auto object-cover">` 
                        : '<div class="h-12 w-10 bg-gray-200 flex items-center justify-center text-gray-500">N/A</div>';
                    
                    let row = `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">${book.title}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${book.author}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${book.publication_year}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${book.available}/${book.stock}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <a href="/books/view/${book.id}" class="text-indigo-600 hover:text-indigo-900 mr-3" title="View ${book.title}">View</a>
                                <button class="text-red-600 hover:text-red-900 delete-book" data-id="${book.id}">Delete</button>
                            </td>
                        </tr>
                    `;
                    
                    $('#book-list').append(row);
                });
                
                // Set up delete button handlers
                $('.delete-book').click(function() {
                    let bookId = $(this).data('id');
                    if (confirm('Are you sure you want to delete this book?')) {
                        deleteBook(bookId);
                    }
                });
            },
            error: function(xhr) {
                console.error('Error loading books:', xhr);
                alert('Failed to load books. Please try again later.');
            }
        });
    }
    
    function deleteBook(bookId) {
        $.ajax({
            url: `/api/books/${bookId}/`,
            type: 'DELETE',
            success: function() {
                loadBooks(); // Reload the books after deletion
            },
            error: function(xhr) {
                console.error('Error deleting book:', xhr);
                alert('Failed to delete book. Please try again later.');
            }
        });
    }


    $('#add-book-form').submit(function(e) {
        e.preventDefault();
        
        
        let formData = new FormData(this);
        
        
        $.ajax({
            url: '/api/books/',
            type: 'POST',
            data: formData,
            processData: false,  
            contentType: false,  
            success: function(response) {
                alert('Book added successfully!');
                window.location.href = "/books/";
            },
            error: function(xhr) {
                console.error('Error adding book:', xhr);
                
                if (xhr.responseJSON) {
                    let errors = '';
                    $.each(xhr.responseJSON, function(field, messages) {
                        errors += `${field}: ${messages.join(', ')}\n`;
                    });
                    alert(`Failed to add book:\n${errors}`);
                } else {
                    alert('Failed to add book. Please check your inputs and try again.');
                }
            }
        });
    });
    
    // Validation for available quantity not exceeding stock
    $('#available, #stock').change(function() {
        let available = parseInt($('#available').val()) || 0;
        let stock = parseInt($('#stock').val()) || 0;
        
        if (available > stock) {
            alert('Available quantity cannot exceed stock quantity.');
            $('#available').val(stock);
        }
    });

    const currentBookId = window.location.pathname.split('/').filter(Boolean).pop();
    
    // Show edit modal
    $('#editBookBtn').on('click', function() {
        // Get the current book data
        $.ajax({
            url: `/api/books/${currentBookId}/`,
            method: 'GET',
            success: function(data) {
                // Populate the form with current book data
                $('#input_title').val(data.title);
                $('#input_author').val(data.author);
                $('#input_publication_year').val(data.publication_year);
                $('#input_publisher').val(data.publisher);
                $('#input_genre').val(data.genre);
                $('#input_stock').val(data.stock);
                $('#input_available').val(data.available);
                $('#input_description').val(data.description);
                
                // Show the modal
                $('#editBookModal').removeClass('hidden');
            },
            error: function(error) {
                console.error('Error fetching book details:', error);
                alert('Failed to load book details. Please try again.');
            }
        });
    });
    
    // Hide modal (both close button and cancel button)
    $('#closeModal, #cancelEdit').on('click', function() {
        $('#editBookModal').addClass('hidden');
    });
    
    // Submit form to update book
    $('#editBookForm').on('submit', function(e) {
        e.preventDefault();
        
        // Create FormData object for file upload
        const formData = new FormData(this);
        
        $.ajax({
            url: `/api/books/${currentBookId}/update/`,
            method: 'PUT',
            data: formData,
            processData: false,  // Don't process the data
            contentType: false,  // Don't set content type
            success: function(data) {
                // Update the UI with new data
                $('#bookTitle').text(data.title);
                $('#bookAuthor').text(data.author);
                $('#bookYear').text(data.publication_year || 'N/A');
                $('#bookPublisher').text(data.publisher || 'N/A');
                $('#bookGenre').text(data.genre || 'N/A');
                $('#bookStock').text(data.stock);
                $('#bookAvailable').text(data.available);
                $('#bookDescription').text(data.description || 'No description available.');
                
                // If there's an image update, refresh the page to show the new image
                if (formData.get('cover_pic') && formData.get('cover_pic').size > 0) {
                    window.location.reload();
                } else {
                    // Hide the modal
                    $('#editBookModal').addClass('hidden');
                }
                
                // Show success message
                showNotification('Book updated successfully', 'success');
            },
            error: function(error) {
                console.error('Error updating book:', error);
                showNotification('Failed to update book. Please check the form and try again.', 'error');
            }
        });
    });
    
    // Helper function to show notifications
    function showNotification(message, type) {
        const notificationClass = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        
        const notification = $(`
            <div class="fixed top-4 right-4 px-4 py-2 rounded-md text-white ${notificationClass} shadow-lg transition-opacity duration-300">
                ${message}
            </div>
        `);
        
        $('body').append(notification);
        
        // Remove notification after 3 seconds
        setTimeout(function() {
            notification.css('opacity', '0');
            setTimeout(function() {
                notification.remove();
            }, 300);
        }, 3000);
    }
});