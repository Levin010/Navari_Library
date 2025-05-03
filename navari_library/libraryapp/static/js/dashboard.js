$(document).ready(function() {
   
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function fetchDashboardStats() {
        $.ajax({
            url: '/api/dashboard-stats/',
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                $('#total-books-count').text(formatNumber(data.total_books));
                
                $('#books-borrowed-count').text(formatNumber(data.books_borrowed));
                
                $('#books-overdue-count').text(formatNumber(data.books_overdue));
                
                $('#total-debt-amount').text(formatNumber(data.total_debt));
            },
            error: function(xhr, status, error) {
                console.error('Error fetching dashboard stats:', error);
            }
        });
    }
    
    fetchDashboardStats();
    
    setInterval(fetchDashboardStats, 5 * 60 * 1000);
});