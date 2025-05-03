from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import datetime

class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    publication_year = models.IntegerField(
    validators=[
        MinValueValidator(1000),
        MaxValueValidator(datetime.datetime.now().year)
    ],
    blank=True, null=True
    )
    publisher = models.CharField(max_length=255, blank=True, null=True)
    stock = models.IntegerField(default=1)
    available = models.IntegerField(default=1)
    cover_pic = models.ImageField(upload_to='book_covers/', blank=True, null=True)
    genre = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} by {self.author}"
    
    class Meta:
        db_table = 'book'
        ordering = ['title']
        
class Member(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    postal_address = models.TextField(blank=True, null=True)
    profile_pic = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    joined_date = models.DateField(auto_now_add=True)
    outstanding_debt = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.00)]
    )

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        db_table = 'member'
        ordering = ['first_name', 'last_name']
        
        
class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('ISSUE', 'Issue'),
        ('RETURN', 'Return'),
    )
    
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('OVERDUE', 'Overdue'),
    )
    
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    book = models.ForeignKey('Book', on_delete=models.CASCADE, related_name='transactions')
    member = models.ForeignKey('Member', on_delete=models.CASCADE, related_name='transactions')
    issue_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateTimeField(null=True, blank=True)
    return_date = models.DateTimeField(null=True, blank=True)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    def __str__(self):
        member_name = f"{self.member.first_name} {self.member.last_name}".strip() if self.member else ""
        return f"{self.transaction_type} - {self.book.title} - {self.member_name}"
    
    def calculate_fee(self):
       
        if self.transaction_type != 'ISSUE' or self.status == 'COMPLETED':
            return self.fee
        
        settings = Settings.objects.first()
        if not settings:
            return self.fee
            
        start_date = self.issue_date.date()
        end_date = self.return_date.date() if self.return_date else timezone.now().date()
        days_elapsed = (end_date - start_date).days
        
        fee = days_elapsed * settings.charge_per_day
        return fee
    
    def update_fee(self):
        
        if self.transaction_type == 'ISSUE' and self.status != 'COMPLETED':
           
            old_fee = self.fee
            
            new_fee = self.calculate_fee()
            
            fee_difference = new_fee - old_fee
            
            self.fee = new_fee
            
            if self.due_date and timezone.now() > self.due_date:
                self.status = 'OVERDUE'
                
            self.save()
            
            if fee_difference > 0:
                member = self.member
                member.outstanding_debt += fee_difference
                member.save()
                
            return fee_difference
        return 0
    
    class Meta:
        db_table = 'transaction'
        ordering = ['-issue_date']
        

class Settings(models.Model):
    loan_period_days = models.PositiveIntegerField(default=14)
    charge_per_day = models.DecimalField(max_digits=6, decimal_places=2, default=10.00)
    max_outstanding_debt = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    
    def __str__(self):
        return f"Settings (Loan Period: {self.loan_period_days} days)"
    
    class Meta:
        db_table = 'settings'
        verbose_name = "Settings"
        verbose_name_plural = "Settings"