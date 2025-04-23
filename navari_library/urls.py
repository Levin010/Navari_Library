"""
URL configuration for navari_library project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from navari_library.libraryapp import views
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'books', views.BookViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path("admin/", admin.site.urls),
    path('', views.home_view, name='home'),
    
    path('dashboard/', views.dashboard_view, name='dashboard'),
    
    path('books/', views.books_view, name='books'),
    path('books/add/', views.add_book_view, name='book_add'),
    path('books/view/<int:book_id>/', views.book_detail_view, name='book_detail'),
    path('api/books/<int:book_id>/', views.book_detail_api, name='book_detail_api'),
    path('api/books/<int:book_id>/update/', views.update_book, name='update_book'),
    
    path('members/', views.members_view, name='members'),
    
    path('transactions/', views.transactions_view, name='transactions'),
]

# serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
