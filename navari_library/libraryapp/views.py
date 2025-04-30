from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Book, Member, Transaction, Settings
from .serializers import BookSerializer, MemberSerializer, TransactionSerializer, SettingsSerializer, MemberReportSerializer, BookReportSerializer
import io
from fpdf import FPDF
import datetime


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
                fee=0.00,
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
        
    @action(detail=False, methods=['get'])
    def get_updated_transactions(self, request):
        """Get all transactions with updated fees and update member's outstanding debt"""
        # First update all fees for pending issues
        pending_issues = Transaction.objects.filter(
            transaction_type='ISSUE',
            status__in=['PENDING', 'OVERDUE'],
            return_date__isnull=True
        )
    
        for transaction in pending_issues:
            transaction.update_fee()
    
        # Then get all transactions
        transactions = self.get_queryset()
        page = self.paginate_queryset(transactions)
    
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
    
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)
        
    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        try:
        # Get the transaction
            transaction = Transaction.objects.get(pk=pk)
        
        # Check if it's an issue transaction that hasn't been returned
            if transaction.transaction_type != 'ISSUE' or transaction.return_date:
                return Response({"error": "Invalid transaction for return"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the transaction
            transaction.return_date = timezone.now()
            transaction.status = 'COMPLETED'
            transaction.save()
            
        # Calculate the final fee before completing the transaction
            final_fee = transaction.calculate_fee()
            transaction.fee = final_fee
            transaction.status = 'COMPLETED'
            transaction.save()
        
        # Create a return transaction
            return_transaction = Transaction.objects.create(
                transaction_type='RETURN',
                book=transaction.book,
                member=transaction.member,
                issue_date=timezone.now(),
                status='COMPLETED'
           )
        
        # Update book availability
            book = transaction.book
            book.available += 1
            book.save()
        
        # Reset member's outstanding debt for this book
            member = transaction.member
            member.outstanding_debt -= final_fee
            if member.outstanding_debt < 0:
                member.outstanding_debt = 0
            member.save()
        
            return Response(TransactionSerializer(return_transaction).data, status=status.HTTP_201_CREATED)
        
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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

def reports(request):
    return render(request, 'report/reports.html')

def member_reports(request):
    return render(request, 'report/reports_members.html')

class MemberReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberReportSerializer
    
    def get_queryset(self):
        queryset = Member.objects.all()
        status_filter = self.request.query_params.get('status', None)
        
        if status_filter == 'active':
            queryset = queryset.filter(outstanding_debt__lt=500)
        elif status_filter == 'restricted':
            queryset = queryset.filter(outstanding_debt__gte=500)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def generate_pdf(self, request):
        # Get filtered data
        members = self.get_queryset()
        
        # Create PDF
        pdf = FPDF()
        pdf.add_page()
        
        # Set up the PDF
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(190, 10, 'Members Report', 0, 1, 'C')
        pdf.ln(10)
        
        # Add date
        pdf.set_font('Arial', '', 10)
        pdf.cell(190, 5, f'Generated: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'R')
        pdf.ln(5)
        
        # Table header
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(10, 10, 'ID', 1, 0, 'C')
        pdf.cell(50, 10, 'Name', 1, 0, 'C')
        pdf.cell(50, 10, 'Email', 1, 0, 'C')
        pdf.cell(30, 10, 'Joined Date', 1, 0, 'C')
        pdf.cell(30, 10, 'Debt', 1, 0, 'C')
        pdf.cell(20, 10, 'Status', 1, 1, 'C')
        
        # Table data
        pdf.set_font('Arial', '', 10)
        for member in members:
            status = "Restricted" if member.outstanding_debt >= 500 else "Active"
            
            pdf.cell(10, 10, str(member.id), 1, 0, 'C')
            pdf.cell(50, 10, f"{member.first_name} {member.last_name}", 1, 0, 'L')
            pdf.cell(50, 10, member.email, 1, 0, 'L')
            pdf.cell(30, 10, member.joined_date.strftime("%Y-%m-%d"), 1, 0, 'C')
            pdf.cell(30, 10, f"${member.outstanding_debt}", 1, 0, 'R')
            pdf.cell(20, 10, status, 1, 1, 'C')
        
        # Footer
        pdf.ln(10)
        pdf.set_font('Arial', 'I', 8)
        pdf.cell(0, 10, 'Library Management System - Page ' + str(pdf.page_no()), 0, 0, 'C')
        
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="members_report.pdf"'
        pdf_output = pdf.output(dest='S').encode('latin1')
        response.write(pdf_output)
        
        return response
    
def book_reports(request):
    return render(request, 'report/reports_books.html')

class BookReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookReportSerializer
    
    def get_queryset(self):
        queryset = Book.objects.all()
        availability_filter = self.request.query_params.get('availability', None)
        
        if availability_filter == 'available':
            queryset = queryset.filter(available__gt=0)
        elif availability_filter == 'not_available':
            queryset = queryset.filter(available=0)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def generate_pdf(self, request):
        # Get filtered data
        books = self.get_queryset()
        
        # Create PDF
        pdf = FPDF()
        pdf.add_page()
        
        # Set up the PDF
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(190, 10, 'Books Report', 0, 1, 'C')
        pdf.ln(10)
        
        # Add date
        pdf.set_font('Arial', '', 10)
        pdf.cell(190, 5, f'Generated: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'R')
        pdf.ln(5)
        
        # Table header
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(10, 10, 'ID', 1, 0, 'C')
        pdf.cell(50, 10, 'Title', 1, 0, 'C')
        pdf.cell(35, 10, 'Author', 1, 0, 'C')
        pdf.cell(20, 10, 'Year', 1, 0, 'C')
        pdf.cell(35, 10, 'Publisher', 1, 0, 'C')
        pdf.cell(20, 10, 'Avail/Stock', 1, 0, 'C')
        pdf.cell(20, 10, 'Status', 1, 1, 'C')
        
        # Table data
        pdf.set_font('Arial', '', 10)
        for book in books:
            status = "Available" if book.available > 0 else "Not Available"
            
            pdf.cell(10, 10, str(book.id), 1, 0, 'C')
            
            # Handle potentially long titles
            title_text = book.title
            if len(title_text) > 30:
                title_text = title_text[:27] + '...'
            pdf.cell(50, 10, title_text, 1, 0, 'L')
            
            # Handle potentially long author names
            author_text = book.author
            if len(author_text) > 20:
                author_text = author_text[:17] + '...'
            pdf.cell(35, 10, author_text, 1, 0, 'L')
            
            # Publication year
            year_text = str(book.publication_year) if book.publication_year else "N/A"
            pdf.cell(20, 10, year_text, 1, 0, 'C')
            
            # Publisher
            publisher_text = book.publisher if book.publisher else "N/A"
            if len(publisher_text) > 20:
                publisher_text = publisher_text[:17] + '...'
            pdf.cell(35, 10, publisher_text, 1, 0, 'L')
            
            # Availability
            pdf.cell(20, 10, f"{book.available}/{book.stock}", 1, 0, 'C')
            pdf.cell(20, 10, status, 1, 1, 'C')
        
        # Footer
        pdf.ln(10)
        pdf.set_font('Arial', 'I', 8)
        pdf.cell(0, 10, 'Library Management System - Page ' + str(pdf.page_no()), 0, 0, 'C')
        
        # Create response
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="books_report.pdf"'
        pdf_output = pdf.output(dest='S').encode('latin1')
        response.write(pdf_output)
        
        return response