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