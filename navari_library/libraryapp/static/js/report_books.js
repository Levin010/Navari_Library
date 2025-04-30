$(document).ready(function() {
    
    let table = $('#books-table').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: '/api/book-reports/',
            dataSrc: ''
        },
        columns: [
            { data: 'id', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'title', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { data: 'author', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { 
                data: 'publication_year', 
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black',
                render: function(data) {
                    return data || 'N/A';
                }
            },
            { 
                data: 'publisher', 
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black',
                render: function(data) {
                    return data || 'N/A';
                }
            },
            { 
                data: 'availability', 
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black'
            },
            { data: 'date_added', className: 'px-4 py-2 border-b border-gray-200 text-sm text-black' },
            { 
                data: 'availability_status',
                className: 'px-4 py-2 border-b border-gray-200 text-sm text-black',
                render: function(data) {
                    if (data === 'Available') {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Available</span>';
                    } else {
                        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Not Available</span>';
                    }
                }
            }
        ]
        
    });
    
    // Availability filter buttons
    $('.availability-filter').on('click', function() {
        let availability = $(this).data('availability');
        
        // Update active state for buttons
        $('.availability-filter').removeClass('bg-blue-500 text-white').addClass('bg-gray-200');
        $(this).removeClass('bg-gray-200').addClass('bg-blue-500 text-white');
        
        // Filter the table
        if (availability === 'all') {
            table.ajax.url('/api/book-reports/').load();
        } else {
            table.ajax.url('/api/book-reports/?availability=' + availability).load();
        }
    });
    
    
    $('#export-pdf').on('click', function() {
        let availability = $('.availability-filter.bg-blue-500').data('availability');
        let url = '/api/book-reports/generate_pdf/';
        
        if (availability !== 'all') {
            url += '?availability=' + availability;
        }
        
        window.location.href = url;
    });

    
});