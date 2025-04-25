$(document).ready(function() {
    // Load settings
    loadSettings();
    
    // Setup form submission
    $('#settings-form').on('submit', saveSettings);
});

function loadSettings() {
    $.ajax({
        url: '/api/settings/',
        method: 'GET',
        success: function(data) {
            
            $('#loan-period').val(data.loan_period_days);
            $('#charge-per-day').val(data.charge_per_day);
            $('#max-debt').val(data.max_outstanding_debt);
        },
        error: function(error) {
            showAlert('Error loading settings', 'error');
        }
    });
}

function saveSettings(e) {
    e.preventDefault();
    
    const settings = {
        loan_period_days: parseInt($('#loan-period').val()),
        charge_per_day: parseFloat($('#charge-per-day').val()),
        max_outstanding_debt: parseFloat($('#max-debt').val())
    };
    
    $.ajax({
        url: '/api/settings/update_settings/',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(settings),
        success: function(data) {
            showAlert('Settings saved successfully', 'success');
        },
        error: function(error) {
            showAlert('Error saving settings', 'error');
        }
    });
}

function showAlert(message, type) {
    const alertDiv = $('<div>').addClass(`alert alert-${type}`).text(message);
    $('#alerts-container').append(alertDiv);
    
    setTimeout(() => {
        alertDiv.fadeOut(500, function() {
            $(this).remove();
        });
    }, 3000);
}