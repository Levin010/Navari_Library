from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Book, Member, Transaction, Settings
from .serializers import BookSerializer, MemberSerializer, TransactionSerializer, SettingsSerializer

def home_view(request):
    return render(request, 'home.html')

def dashboard_view(request):
    return render(request, 'dashboard.html')

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

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all().order_by('-joined_date')
    serializer_class = MemberSerializer
    filterset_fields = ['outstanding_debt', 'joined_date']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number']

def members_view(request):
    return render(request, 'member/members.html')

def add_member_view(request):
    
    return render(request, 'member/add_member.html')

def member_detail_view(request, member_id):
    
    member = get_object_or_404(Member, id=member_id)
    return render(request, 'member/member_detail.html', {'member': member})

@api_view(['GET'])
def member_detail_api(request, member_id):
    
    member = get_object_or_404(Member, id=member_id)
    serializer = MemberSerializer(member)
    return Response(serializer.data)

@api_view(['PUT'])
def update_member(request, member_id):
    
    member = get_object_or_404(Member, id=member_id)
    serializer = MemberSerializer(member, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    
    @action(detail=False, methods=['post'])
    def issue_book(self, request):
        book_id = request.data.get('book')
        member_id = request.data.get('member')
        
        try:
            book = Book.objects.get(id=book_id)
            member = Member.objects.get(id=member_id)
            settings = Settings.objects.first()
            
            # Check if book is available
            if book.available <= 0:
                return Response({"error": "Book is not available for issue"}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Check if member has outstanding debt
            if member.outstanding_debt >= settings.max_outstanding_debt:
                return Response({"error": f"Member has outstanding debt of {member.outstanding_debt} which exceeds limit of {settings.max_outstanding_debt}"}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate due date
            issue_date = timezone.now()
            due_date = issue_date + timedelta(days=settings.loan_period_days)
            
            # Create transaction
            transaction = Transaction.objects.create(
                transaction_type='ISSUE',
                book=book,
                member=member,
                issue_date=issue_date,
                due_date=due_date,
                status='PENDING'
            )
            
            # Update book availability
            book.available -= 1
            book.save()
            
            return Response(TransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)
            
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=status.HTTP_404_NOT_FOUND)
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def return_book(self, request):
        book_id = request.data.get('book')
        member_id = request.data.get('member')
        
        try:
            book = Book.objects.get(id=book_id)
            member = Member.objects.get(id=member_id)
            settings = Settings.objects.first()
            
            # Find the issue transaction for this book and member
            issue_transaction = Transaction.objects.filter(
                book=book,
                member=member,
                transaction_type='ISSUE',
                return_date__isnull=True
            ).first()
            
            if not issue_transaction:
                return Response({"error": "No active issue found for this book and member"}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate fee
            return_date = timezone.now()
            days_overdue = 0
            
            if return_date > issue_transaction.due_date:
                days_overdue = (return_date - issue_transaction.due_date).days
                
            fee = Decimal(days_overdue) * settings.charge_per_day
            
            # Update issue transaction
            issue_transaction.return_date = return_date
            issue_transaction.fee = fee
            
            if days_overdue > 0:
                issue_transaction.status = 'OVERDUE'
            else:
                issue_transaction.status = 'COMPLETED'
                
            issue_transaction.save()
            
            # Create return transaction
            return_transaction = Transaction.objects.create(
                transaction_type='RETURN',
                book=book,
                member=member,
                issue_date=return_date,
                fee=fee,
                status='COMPLETED'
            )
            
            # Update book availability
            book.available += 1
            book.save()
            
            # Update member's outstanding debt
            member.outstanding_debt -= fee
            member.save()
            
            return Response({
                'return_transaction': TransactionSerializer(return_transaction).data,
                'issue_transaction': TransactionSerializer(issue_transaction).data
            }, status=status.HTTP_201_CREATED)
            
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=status.HTTP_404_NOT_FOUND)
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
            
def transactions_view(request):
    return render(request, 'transaction/transactions.html')

class SettingsViewSet(viewsets.ModelViewSet):
    queryset = Settings.objects.all()
    serializer_class = SettingsSerializer
    
    def list(self, request):
        settings = Settings.objects.first()
        if not settings:
            settings = Settings.objects.create()
        
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'])
    def update_settings(self, request):
        settings = Settings.objects.first()
        if not settings:
            settings = Settings.objects.create()
            
        serializer = self.get_serializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
def settings_view(request):
    return render(request, 'transaction/settings.html')
