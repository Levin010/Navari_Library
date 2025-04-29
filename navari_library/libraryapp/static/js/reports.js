$(document).ready(function() {
    // Initialize DataTable
    let table = $('#members-table').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: '/api/member-reports/',
            dataSrc: ''
        },
        columns: [
            { data: 'id' },
            { data: 'full_name' },
            { data: 'email' },
            { data: 'phone_number' },
            { data: 'joined_date' },
            { 
                data: 'outstanding_debt',
                render: function(data) {
                    return '$' + parseFloat(data).toFixed(2);
                }
            },
            { 
                data: 'status',
                render: function(data) {
                    if (data === 'Active') {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>';
                    } else {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Restricted</span>';
                    }
                }
            }
        ]
    });
    
    // Status filter buttons
    $('.status-filter').on('click', function() {
        let status = $(this).data('status');
        
        // Update active state for buttons
        $('.status-filter').removeClass('bg-blue-500 text-white').addClass('bg-gray-200');
        $(this).removeClass('bg-gray-200').addClass('bg-blue-500 text-white');
        
        // Filter the table
        if (status === 'all') {
            table.ajax.url('/api/member-reports/').load();
        } else {
            table.ajax.url('/api/member-reports/?status=' + status).load();
        }
    });
    
    // Export PDF button
    $('#export-pdf').on('click', function() {
        let status = $('.status-filter.bg-blue-500').data('status');
        let url = '/api/member-reports/generate_pdf/';
        
        if (status !== 'all') {
            url += '?status=' + status;
        }
        
        window.location.href = url;
    });
});