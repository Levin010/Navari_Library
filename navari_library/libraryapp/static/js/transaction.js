// transactions.js
$(document).ready(function() {
    // Load transactions
    loadTransactions();
    
    // Setup event handlers
    $('#issue-book-form').on('submit', handleIssueBook);
    $('#return-book-form').on('submit', handleReturnBook);

    // Setup modal buttons
    $('#issue-book-btn').on('click', function() {
        // Clear any previous selections
        $('#issue-book-id').val('');
        $('#issue-member-id').val('');
        
        // Reload books and members to get the latest data
        loadBooks();
        loadMembers();
        
        // Show the issue book modal
        $('#issue-book-modal').removeClass('hidden').addClass('flex');
    });
    
    $('#return-book-btn').on('click', function() {
        // Load books and members dropdowns
        loadIssuedBooks();
        
        // Show the return book modal
        $('#return-book-modal').removeClass('hidden').addClass('flex');
    });
    
    // Close modals when clicking cancel buttons
    $('.modal-cancel-btn, button[onclick="$(\'#issue-book-modal\').hide()"]').on('click', function() {
        $(this).closest('.fixed').addClass('hidden').removeClass('flex');
    });
    
    // Close modal when clicking outside (optional)
    $(window).on('click', function(event) {
        if ($(event.target).hasClass('fixed')) {
            $('.fixed').addClass('hidden').removeClass('flex');
        }
    });
    
    // Load books and members dropdowns
    loadBooks();
    loadMembers();
});

function loadTransactions(filters = {}) {
    let url = '/api/transactions/';
    
    // Add any filters to the URL
    if (Object.keys(filters).length > 0) {
        url += '?' + $.param(filters);
    }
    
    $.ajax({
        url: url,
        method: 'GET',
        success: function(data) {
            // Enrich the data with member name if needed
            data.forEach(transaction => {
                if (!transaction.member_name) {
                    // Make an additional request to get member details
                    $.ajax({
                        url: `/api/members/${transaction.member}/`,
                        method: 'GET',
                        async: false, // Use synchronous request to ensure name is set before rendering
                        success: function(memberData) {
                            transaction.member_name = `${memberData.first_name} ${memberData.last_name}`.trim();
                        }
                    });
                }
            });
            renderTransactionsTable(data);
        },
        error: function(error) {
            showAlert('Error loading transactions', 'error');
        }
    });
}

function renderTransactionsTable(transactions) {
    const tableBody = $('#transactions-table tbody');
    tableBody.empty();
    
    transactions.forEach(transaction => {
        // Define status badge styling based on status
        let statusBadgeClass = '';
        switch(transaction.status.toLowerCase()) {
            case 'pending':
                statusBadgeClass = 'bg-yellow-100 text-yellow-800';
                break;
            case 'completed':
                statusBadgeClass = 'bg-green-100 text-green-800';
                break;
            case 'overdue':
                statusBadgeClass = 'bg-red-100 text-red-800';
                break;
            case 'issued':
                statusBadgeClass = 'bg-blue-100 text-blue-800';
                break;
            case 'returned':
                statusBadgeClass = 'bg-green-100 text-green-800';
                break;
        }
        
        const row = `
            <tr class="${transaction.status === 'OVERDUE' ? 'bg-red-50' : ''}">
                <td class="px-6 py-4 whitespace-nowrap">#${transaction.id}</td>
                <td class="px-6 py-4 whitespace-nowrap">${transaction.book_title}</td>
                <td class="px-6 py-4 whitespace-nowrap">${transaction.member_name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${formatDate(transaction.issue_date)}</td>
                <td class="px-6 py-4 whitespace-nowrap">${transaction.due_date ? formatDate(transaction.due_date) : '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeClass}">
                        ${transaction.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">KES ${transaction.fee}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${transaction.transaction_type === 'ISSUE' && !transaction.return_date ? 
                        `<button class="return-book-btn px-3 py-1 text-white bg-blue-500 hover:bg-blue-600 rounded" data-book="${transaction.book}" data-member="${transaction.member}">Return</button>` : ''}
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
    
    // Add event handler for return buttons
    $('.return-book-btn').on('click', function() {
        const bookId = $(this).data('book');
        const memberId = $(this).data('member');
        
        // Pre-fill return form
        $('#return-book-id').val(bookId);
        $('#return-member-id').val(memberId);
        
        // Show return modal
        $('#return-book-modal').show();
    });
}



function handleIssueBook(e) {
    e.preventDefault();
    
    const bookId = $('#issue-book-id').val();
    const memberId = $('#issue-member-id').val();
    
    $.ajax({
        url: '/api/transactions/issue_book/',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            book: bookId,
            member: memberId
        }),
        success: function(data) {
            showAlert('Book issued successfully', 'success');
            $('#issue-book-modal').addClass('hidden').removeClass('flex');
            loadTransactions();
        },
        error: function(error) {
            showAlert(error.responseJSON.error || 'Error issuing book', 'error');
        }
    });
}



// Function to load only books that are currently issued
function loadIssuedBooks() {
    $.ajax({
        url: '/api/transactions/?transaction_type=ISSUE&status=COMPLETED',
        method: 'GET',
        success: function(data) {
            const bookDropdown = $('#return-book-id');
            const memberDropdown = $('#return-member-id');
            bookDropdown.empty();
            memberDropdown.empty();
            
            // Group by book and member
            const issuedBooks = {};
            
            data.forEach(transaction => {
                if (!transaction.return_date) {
                    const key = `${transaction.book}|${transaction.member}`;
                    issuedBooks[key] = {
                        book_id: transaction.book,
                        book_title: transaction.book_title,
                        member_id: transaction.member,
                        member_name: transaction.member_name
                    };
                }
            });
            
            // Add options for each issued book
            Object.values(issuedBooks).forEach(item => {
                bookDropdown.append(`<option value="${item.book_id}" data-member="${item.member_id}">${item.book_title} (issued to ${item.member_name})</option>`);
            });
            
            // Update member when book changes
            bookDropdown.on('change', function() {
                const selectedOption = $(this).find('option:selected');
                const memberId = selectedOption.data('member');
                memberDropdown.val(memberId);
            });
            
            // Trigger change to set initial member
            bookDropdown.trigger('change');
        }
    });
}

function handleReturnBook(e) {
    e.preventDefault();
    
    const bookId = $('#return-book-id').val();
    const memberId = $('#return-member-id').val();
    
    $.ajax({
        url: '/api/transactions/return/',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            book: bookId,
            member: memberId
        }),
        success: function(data) {
            showAlert('Book returned successfully', 'success');
            $('#return-book-modal').addClass('hidden').removeClass('flex');
            loadTransactions();
        },
        error: function(error) {
            showAlert(error.responseJSON.error || 'Error returning book', 'error');
        }
    });
}

function loadBooks() {
    $.ajax({
        url: '/api/books/',
        method: 'GET',
        success: function(data) {
            const bookDropdowns = $('.book-dropdown');
            bookDropdowns.empty();
            
            data.forEach(book => {
                if (book.available > 0) {
                    bookDropdowns.append(`<option value="${book.id}">${book.title}</option>`);
                }
            });
        }
    });
}

function loadMembers() {
    $.ajax({
        url: '/api/members/',
        method: 'GET',
        success: function(data) {
            console.log("Members data received:", data);
            
            const memberDropdowns = $('.member-dropdown');
            memberDropdowns.empty();
            memberDropdowns.append('<option value="">Select a member</option>');
            
            if (Array.isArray(data)) {
                data.forEach(member => {
                    // Combine first_name and last_name since there's no name field
                    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                    memberDropdowns.append(`<option value="${member.id}">${fullName}</option>`);
                });
            } else if (typeof data === 'object' && data !== null) {
                // Single member or different structure
                const memberArray = Array.isArray(data.results) ? data.results : [data];
                
                memberArray.forEach(member => {
                    // Combine first_name and last_name since there's no name field
                    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                    memberDropdowns.append(`<option value="${member.id}">${fullName}</option>`);
                });
            }
            
            console.log("Options count:", memberDropdowns.find('option').length);
        },
        error: function(error) {
            console.error("Error loading members:", error);
            showAlert('Error loading members', 'error');
        }
    });
}

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showAlert(message, type) {
    let alertClass = type === 'success' ? 
        'bg-green-100 text-green-800 border border-green-200' : 
        'bg-red-100 text-red-800 border border-red-200';
    
    const alertDiv = $('<div>')
        .addClass(`p-3 mb-4 rounded ${alertClass}`)
        .text(message);
    
    $('#alerts-container').append(alertDiv);
    
    setTimeout(() => {
        alertDiv.fadeOut(500, function() {
            $(this).remove();
        });
    }, 3000);
}

// Filter functionality
$('#filter-all').on('click', function() {
    loadTransactions();
});

$('#filter-issues').on('click', function() {
    loadTransactions({ transaction_type: 'ISSUE' });
});

$('#filter-returns').on('click', function() {
    loadTransactions({ transaction_type: 'RETURN' });
});

$('#filter-overdue').on('click', function() {
    loadTransactions({ status: 'OVERDUE' });
});

$('#date-range').on('change', function() {
    const days = $(this).val();
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    loadTransactions({ 
        after: date.toISOString().split('T')[0]
    });
});