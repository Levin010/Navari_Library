$(document).ready(function() {
    
    let table = $('#transactions-table').DataTable({
        processing: true,
        serverSide: false,
        order: [[4, 'desc']], 
        ajax: {
            url: '/api/transaction-reports/',
            dataSrc: ''
        },
        columns: [
            { data: 'transaction_id', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { 
                data: 'transaction_type', 
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black',
                render: function(data) {
                    if (data === 'ISSUE') {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Issue</span>';
                    } else {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Return</span>';
                    }
                }
            },
            { data: 'book_title', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'member_name', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'issue_date_formatted', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'due_date_formatted', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'return_date_formatted', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { 
                data: 'fee', 
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black',
                render: function(data) {
                    return 'KES ' + parseFloat(data).toFixed(2);
                }
            },
            { 
                data: 'status',
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black',
                render: function(data) {
                    if (data === 'COMPLETED') {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span>';
                    } else if (data === 'OVERDUE') {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Overdue</span>';
                    } else {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>';
                    }
                }
            }
        ]
    });
    
    // Transaction type filter buttons
    $('.transaction-type-filter').on('click', function() {
        const transactionType = $(this).data('type');
        
        // Update active state for buttons
        $('.transaction-type-filter').removeClass('bg-blue-500 text-white').addClass('bg-gray-200');
        $(this).removeClass('bg-gray-200').addClass('bg-blue-500 text-white');
        
        applyFilters();
    });
    
    // Status filter buttons
    $('.status-filter').on('click', function() {
        const status = $(this).data('status');
        
        // Update active state for buttons
        $('.status-filter').removeClass('bg-blue-500 text-white').addClass('bg-gray-200');
        $(this).removeClass('bg-gray-200').addClass('bg-blue-500 text-white');
        
        applyFilters();
    });
    
    // Apply both filters
    function applyFilters() {
        const transactionType = $('.transaction-type-filter.bg-blue-500').data('type');
        const status = $('.status-filter.bg-blue-500').data('status');
        
        let url = '/api/transaction-reports/';
        let params = [];
        
        if (transactionType !== 'all') {
            params.push('transaction_type=' + transactionType);
        }
        
        if (status !== 'all') {
            params.push('status=' + status);
        }
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        table.ajax.url(url).load();
    }
    
    // Export PDF with current filters
    $('#export-pdf').on('click', function() {
        const transactionType = $('.transaction-type-filter.bg-blue-500').data('type');
        const status = $('.status-filter.bg-blue-500').data('status');
        
        let url = '/api/transaction-reports/generate_pdf/';
        let params = [];
        
        if (transactionType !== 'all') {
            params.push('transaction_type=' + transactionType);
        }
        
        if (status !== 'all') {
            params.push('status=' + status);
        }
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        window.location.href = url;
    });
});