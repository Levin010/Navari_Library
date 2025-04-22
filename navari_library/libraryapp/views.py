from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Book
from .serializers import BookSerializer

def home_view(request):
    return render(request, 'home.html')

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().order_by('-created_at')
    serializer_class = BookSerializer
    filterset_fields = ['author', 'genre', 'publication_date']
    search_fields = ['title', 'author', 'description']

def books_view(request):
    return render(request, 'books.html')

def add_book_view(request):
    return render(request, 'add_book.html')

def dashboard_view(request):
    return render(request, 'dashboard.html')

def members_view(request):
    return render(request, 'members.html')

def transactions_view(request):
    return render(request, 'transactions.html')