from rest_framework import serializers
from .models import Book, Member, Transaction, Settings
import datetime

class BookSerializer(serializers.ModelSerializer):
    current_year = datetime.datetime.now().year
    YEAR_CHOICES = [(year, year) for year in range(1800, current_year + 1)]

    publication_year = serializers.ChoiceField(choices=YEAR_CHOICES, allow_null=True, required=False)

    class Meta:
        model = Book
        fields = '__all__'
        
    def update(self, instance, validated_data):
        # Handle file upload separately
        cover_pic = validated_data.pop('cover_pic', None)
        if cover_pic:
            instance.cover_pic = cover_pic
            
        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        instance.save()
        return instance
    
    
class MemberSerializer(serializers.ModelSerializer):

    class Meta:
        model = Member
        fields = '__all__'
        
    def update(self, instance, validated_data):
        # Handle file upload separately
        profile_pic = validated_data.pop('profile_pic', None)
        if profile_pic:
            instance.profile_pic = profile_pic
            
        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        instance.save()
        return instance
    
class TransactionSerializer(serializers.ModelSerializer):
    book_title = serializers.ReadOnlyField(source='book.title')
    member_name = serializers.ReadOnlyField(source='member.name')
    current_fee = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = ['id', 'transaction_type', 'book', 'book_title', 'member', 
                  'member_name', 'issue_date', 'due_date', 'return_date', 
                  'fee', 'current_fee','status']
        
    def get_member_name(self, obj):
        """Combine first_name and last_name to create a full name"""
        if obj.member:
            return f"{obj.member.first_name} {obj.member.last_name}".strip()
        return ""
    
    def get_current_fee(self, obj):
        """Get real-time fee calculation"""
        if obj.transaction_type == 'ISSUE' and obj.status != 'COMPLETED':
            return obj.calculate_fee()
        return obj.fee

class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = ['id', 'loan_period_days', 'charge_per_day', 'max_outstanding_debt']
        
class MemberReportSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = Member
        fields = ['id', 'full_name', 'email', 'phone_number', 'joined_date', 
                 'outstanding_debt', 'status']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    
    def get_status(self, obj):
        return "Restricted" if obj.outstanding_debt >= 500 else "Active"
    
class BookReportSerializer(serializers.ModelSerializer):
    availability_status = serializers.SerializerMethodField()
    date_added = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = ['id', 'title', 'author', 'publication_year', 'publisher', 
                 'availability', 'availability_status', 'date_added']
    
    def get_availability_status(self, obj):
        return "Available" if obj.available > 0 else "Not Available"
    
    def get_date_added(self, obj):
        return obj.created_at.strftime("%Y-%m-%d")
    
    def get_availability(self, obj):
        return f"{obj.available}/{obj.stock}"
    
class TransactionReportSerializer(serializers.ModelSerializer):
    transaction_id = serializers.SerializerMethodField()
    book_title = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()
    issue_date_formatted = serializers.SerializerMethodField()
    due_date_formatted = serializers.SerializerMethodField()
    return_date_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = ['id', 'transaction_id', 'transaction_type', 'book_title', 'member_name', 
                 'issue_date_formatted', 'due_date_formatted', 'return_date_formatted', 
                 'fee', 'status']
    
    def get_transaction_id(self, obj):
        return f"{obj.id}-{obj.transaction_type}"
    
    def get_book_title(self, obj):
        return obj.book.title
    
    def get_member_name(self, obj):
        return f"{obj.member.first_name} {obj.member.last_name}"
    
    def get_issue_date_formatted(self, obj):
        return obj.issue_date.strftime("%Y-%m-%d %H:%M")
    
    def get_due_date_formatted(self, obj):
        return obj.due_date.strftime("%Y-%m-%d %H:%M") if obj.due_date else "N/A"
    
    def get_return_date_formatted(self, obj):
        return obj.return_date.strftime("%Y-%m-%d %H:%M") if obj.return_date else "N/A"
    
