$(document).ready(function() {
    
    let table = $('#members-table').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: '/api/member-reports/',
            dataSrc: ''
        },
        columns: [
            { data: 'id', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'full_name', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'email', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'phone_number', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'joined_date', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { 
                data: 'outstanding_debt',
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black',
                render: function(data) {
                    return 'KES ' + parseFloat(data).toFixed(2);
                }
            },
            { 
                data: 'status',
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black',
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
    
    
    $('#export-pdf').on('click', function() {
        let status = $('.status-filter.bg-blue-500').data('status');
        let url = '/api/member-reports/generate_pdf/';
        
        if (status !== 'all') {
            url += '?status=' + status;
        }
        
        window.location.href = url;
    });

    
});