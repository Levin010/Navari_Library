import json
from decimal import Decimal
from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from .models import Book, Member, Transaction, Settings

class MemberTests(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        self.member_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'phone_number': '1234567890',
            'address': '123 Main St, City',
            'outstanding_debt': 0.00
        }
        self.member = Member.objects.create(
            first_name='Jane',
            last_name='Smith',
            email='jane.smith@example.com',
            phone_number='0987654321',
            address='456 Oak St, City',
            outstanding_debt=0.00
        )
        
    def test_create_member(self):
        url = reverse('member-list')
        response = self.client.post(url, self.member_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Member.objects.count(), 2)
        self.assertEqual(Member.objects.get(email='john.doe@example.com').first_name, 'John')
        
    def test_edit_member(self):
        url = reverse('member-detail', kwargs={'pk': self.member.id})
        updated_data = {
            'first_name': 'Jane',
            'last_name': 'Updated',
            'email': 'jane.updated@example.com'
        }
        response = self.client.patch(url, updated_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member.refresh_from_db()
        self.assertEqual(self.member.last_name, 'Updated')
        self.assertEqual(self.member.email, 'jane.updated@example.com')
        
    def test_get_member_detail(self):
        url = f'/api/member/{self.member.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Jane')
        self.assertEqual(response.data['last_name'], 'Smith')


class BookTests(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        self.book_data = {
            'title': 'Python Programming',
            'author': 'John Smith',
            'isbn': '9781234567897',
            'publication_date': '2023-01-01',
            'genre': 'Programming',
            'total_copies': 5,
            'available': 5,
            'description': 'A book about Python programming'
        }
        self.book = Book.objects.create(
            title='Django for Beginners',
            author='William S. Vincent',
            isbn='9781234567890',
            publication_date='2023-01-01',
            genre='Programming',
            total_copies=3,
            available=3,
            description='Introduction to Django'
        )
        
    def test_create_book(self):
        url = reverse('book-list')
        response = self.client.post(url, self.book_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Book.objects.count(), 2)
        self.assertEqual(Book.objects.get(isbn='9781234567897').title, 'Python Programming')
        
    def test_edit_book(self):
        url = reverse('book-detail', kwargs={'pk': self.book.id})
        updated_data = {
            'title': 'Django for Professionals',
            'total_copies': 5,
            'available': 5
        }
        response = self.client.patch(url, updated_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, 'Django for Professionals')
        self.assertEqual(self.book.total_copies, 5)
        
    def test_get_book_detail(self):
        url = f'/api/book/{self.book.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Django for Beginners')
        self.assertEqual(response.data['author'], 'William S. Vincent')


class TransactionTests(TestCase):
    
    def setUp(self):
        self.client = APIClient()
        
        self.settings = Settings.objects.create(
            loan_period_days=14,
            fine_per_day=Decimal('1.00'),
            max_outstanding_debt=Decimal('50.00')
        )
        
        self.member = Member.objects.create(
            first_name='John',
            last_name='Doe',
            email='john.doe@example.com',
            phone_number='1234567890',
            address='123 Main St, City',
            outstanding_debt=0.00
        )
        
        self.book = Book.objects.create(
            title='Django for Beginners',
            author='William S. Vincent',
            isbn='9781234567890',
            publication_date='2023-01-01',
            genre='Programming',
            total_copies=3,
            available=3,
            description='Introduction to Django'
        )
        
    def test_issue_book(self):
        url = reverse('transaction-issue-book')
        issue_data = {
            'book': self.book.id,
            'member': self.member.id
        }
        
        response = self.client.post(url, issue_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Transaction.objects.count(), 1)
        
        self.book.refresh_from_db()
        self.assertEqual(self.book.available, 2)
        
        transaction = Transaction.objects.first()
        self.assertEqual(transaction.transaction_type, 'ISSUE')
        self.assertEqual(transaction.book.id, self.book.id)
        self.assertEqual(transaction.member.id, self.member.id)
        self.assertEqual(transaction.status, 'PENDING')
        
        return transaction
    
    def test_return_book(self):
        issue_transaction = self.test_issue_book()
        
        url = reverse('transaction-return-book', kwargs={'pk': issue_transaction.id})
        response = self.client.post(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.book.refresh_from_db()
        self.assertEqual(self.book.available, 3)
        
        issue_transaction.refresh_from_db()
        self.assertEqual(issue_transaction.status, 'COMPLETED')
        self.assertIsNotNone(issue_transaction.return_date)
        
        return_transaction = Transaction.objects.filter(transaction_type='RETURN').first()
        self.assertIsNotNone(return_transaction)
        self.assertEqual(return_transaction.book.id, self.book.id)
        self.assertEqual(return_transaction.member.id, self.member.id)
        self.assertEqual(return_transaction.status, 'COMPLETED')
    
    def test_issue_unavailable_book(self):
        self.book.available = 0
        self.book.save()
        
        url = reverse('transaction-issue-book')
        issue_data = {
            'book': self.book.id,
            'member': self.member.id
        }
        
        response = self.client.post(url, issue_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not available for issue', response.data['error'])
    
    def test_issue_to_member_with_debt(self):
        self.member.outstanding_debt = Decimal('60.00')
        self.member.save()
        
        url = reverse('transaction-issue-book')
        issue_data = {
            'book': self.book.id,
            'member': self.member.id
        }
        
        response = self.client.post(url, issue_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('outstanding debt', response.data['error'])
    
    def test_issue_already_borrowed_book(self):
        self.test_issue_book()
        
        url = reverse('transaction-issue-book')
        issue_data = {
            'book': self.book.id,
            'member': self.member.id
        }
        
        response = self.client.post(url, issue_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already issued to this member', response.data['error'])
