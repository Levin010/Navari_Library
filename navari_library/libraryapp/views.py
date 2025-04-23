from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
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
    return render(request, 'book/books.html')

def add_book_view(request):
    return render(request, 'book/add_book.html')

def book_detail_view(request, book_id):
    """Renders the book detail template"""
    book = get_object_or_404(Book, id=book_id)
    return render(request, 'book/book_detail.html', {'book': book})

@api_view(['GET'])
def book_detail_api(request, book_id):
    """API endpoint to get book details"""
    book = get_object_or_404(Book, id=book_id)
    serializer = BookSerializer(book)
    return Response(serializer.data)

@api_view(['PUT'])
def update_book(request, book_id):
    """API endpoint to update book details"""
    book = get_object_or_404(Book, id=book_id)
    serializer = BookSerializer(book, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

def dashboard_view(request):
    return render(request, 'dashboard.html')

def members_view(request):
    return render(request, 'members.html')

def transactions_view(request):
    return render(request, 'transactions.html')