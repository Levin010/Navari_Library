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
                                <a href="/books/edit/${book.id}" class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</a>
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
                window.location.href = BOOKS_URL;
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
});