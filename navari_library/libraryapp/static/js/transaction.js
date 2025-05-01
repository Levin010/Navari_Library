
$(document).ready(function() {
    
    loadTransactions();
    
    
    $('#issue-book-form').on('submit', handleIssueBook);

    
    $('#issue-book-btn').on('click', function() {

        $('#modal-error-container').empty();

        $('#issue-book-id').val('');
        $('#issue-member-id').val('');
        
        loadBooks();
        loadMembers();
        
        $('#issue-book-modal').removeClass('hidden').addClass('flex');
    });
    
    
    $('#cancel-return-btn').on('click', function() {
        $('#return-confirmation-modal').addClass('hidden').removeClass('flex');
    });
    
    
    $('#complete-return-btn').on('click', function() {
        const transactionId = $('#return-transaction-id').val();
        
        
        $.ajax({
            url: '/api/transactions/' + transactionId + '/return/',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                transaction_id: transactionId
            }),
            success: function(data) {
                showNotification('Book returned successfully', 'success');
                $('#return-confirmation-modal').addClass('hidden').removeClass('flex');
                loadTransactions(); 
            },
            error: function(error) {
                showNotification(error.responseJSON?.error || 'Error returning book', 'error');
            }
        });
    });
    
    
    $('.modal-cancel-btn, button[onclick="$(\'#issue-book-modal\').hide()"]').on('click', function() {
        $('#modal-error-container').empty();
        $(this).closest('.fixed').addClass('hidden').removeClass('flex');
    });
    
    
    $(window).on('click', function(event) {
        if ($(event.target).hasClass('fixed')) {
            $('.fixed').addClass('hidden').removeClass('flex');
        }
    });
    
    loadBooks();
    loadMembers();

});

function loadTransactions(filters = {}) {
    let url = '/api/transactions/get_updated_transactions/';
    
    
    if (Object.keys(filters).length > 0) {
        url += '?' + $.param(filters);
    }
    
    $.ajax({
        url: url,
        method: 'GET',
        success: function(response) {
            const data = response.results || response;
            
            data.forEach(transaction => {
                if (!transaction.member_name) {
                    
                    $.ajax({
                        url: `/api/members/${transaction.member}/`,
                        method: 'GET',
                        async: false,
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
        }
        let typeBadgeClass = '';
        switch(transaction.transaction_type.toLowerCase()) {
            case 'issue':
                statusBadgeClass = 'bg-blue-100 text-blue-800';
                break;
            case 'return':
                statusBadgeClass = 'bg-green-100 text-green-800';
                break;
        }
        
        const row = `
            <tr class="${transaction.status === 'OVERDUE' ? 'bg-red-50' : ''}">
                <td class="px-6 py-4 whitespace-nowrap">#${transaction.id} ${transaction.transaction_type}</td>
                <td class="px-6 py-4 whitespace-nowrap">${transaction.book_title}</td>
                <td class="px-6 py-4 whitespace-nowrap">${transaction.member_name || 'Unknown'}</td>
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
                        `<button class="return-book-btn px-3 py-1 text-white bg-blue-500 hover:bg-blue-600 rounded" 
                        data-id="${transaction.id}" 
                        data-book="${transaction.book}" 
                        data-book-title="${transaction.book_title}" 
                        data-member="${transaction.member}" 
                        data-member-name="${transaction.member_name || 'Unknown'}" 
                        data-fee="${transaction.fee}">Return</button>` : ''}
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
    
    
    $('.return-book-btn').on('click', function() {
        const transactionId = $(this).data('id');
        const bookId = $(this).data('book');
        const bookTitle = $(this).data('book-title');
        const memberId = $(this).data('member');
        const memberName = $(this).data('member-name');
        const fee = $(this).data('fee');
        
        
        $('#return-transaction-id').val(transactionId);
        
        
        $('#return-confirmation-message').html(
            `Are you sure you want to return <strong>"${bookTitle}"</strong> issued to <strong>"${memberName}"</strong>? 
            <br><br>Make sure the member has paid <strong>KES ${fee}</strong> before completing the return.`
        );
        
        
        $('#return-confirmation-modal').removeClass('hidden').addClass('flex');
    });
}


function handleIssueBook(e) {
    e.preventDefault();
    
    $('#modal-error-container').empty();
    
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
            $('#issue-book-modal').addClass('hidden').removeClass('flex');
            showNotification('Book issued successfully', 'success');
            loadTransactions();
        },
        error: function(error) {
            
            let errorMessage = 'Error issuing book';
            
            if (error.responseJSON) {
                
                if (error.responseJSON.error) {
                    errorMessage = error.responseJSON.error;
                } 
                
                else if (error.responseJSON.detail) {
                    errorMessage = error.responseJSON.detail;
                }
               
                else if (typeof error.responseJSON === 'object') {
                    const fieldErrors = [];
                    
                    Object.keys(error.responseJSON).forEach(field => {
                        const messages = error.responseJSON[field];
                        if (Array.isArray(messages)) {
                            fieldErrors.push(`${field}: ${messages.join(', ')}`);
                        } else if (typeof messages === 'string') {
                            fieldErrors.push(`${field}: ${messages}`);
                        }
                    });
                    
                    if (fieldErrors.length > 0) {
                        errorMessage = fieldErrors.join('<br>');
                    }
                }
            } else if (error.statusText) {
                errorMessage = `${error.status}: ${error.statusText}`;
            }
            
            $('#issue-book-modal').removeClass('hidden').addClass('flex');
           
            $('#modal-error-container').html(
                `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <span class="block sm:inline">${errorMessage}</span>
                </div>`
            );
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
                    
                    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                    memberDropdowns.append(`<option value="${member.id}">${fullName}</option>`);
                });
            } else if (typeof data === 'object' && data !== null) {
                
                const memberArray = Array.isArray(data.results) ? data.results : [data];
                
                memberArray.forEach(member => {
                    
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


function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message, type) {
    const notificationClass = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    
    const notification = $(`
        <div class="fixed top-4 right-4 px-4 py-2 rounded-md text-white ${notificationClass} shadow-lg transition-opacity duration-300">
            ${message}
        </div>
    `);
    
    $('body').append(notification);
    
    
    setTimeout(function() {
        notification.css('opacity', '0');
        setTimeout(function() {
            notification.remove();
        }, 300);
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