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
