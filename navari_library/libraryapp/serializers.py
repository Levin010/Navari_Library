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
    
    class Meta:
        model = Transaction
        fields = ['id', 'transaction_type', 'book', 'book_title', 'member', 
                  'member_name', 'issue_date', 'due_date', 'return_date', 
                  'fee', 'status']
        
    def get_member_name(self, obj):
        """Combine first_name and last_name to create a full name"""
        if obj.member:
            return f"{obj.member.first_name} {obj.member.last_name}".strip()
        return ""

class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = ['id', 'loan_period_days', 'charge_per_day', 'max_outstanding_debt']