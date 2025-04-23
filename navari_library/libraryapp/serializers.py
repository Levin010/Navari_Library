from rest_framework import serializers
from .models import Book
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