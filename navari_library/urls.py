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
from navari_library.libraryapp.views import TransactionViewSet, SettingsViewSet

router = DefaultRouter()
router.register(r'books', views.BookViewSet)
router.register(r'members', views.MemberViewSet)
router.register(r'transactions', views.TransactionViewSet)
router.register(r'settings', views.SettingsViewSet)

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
    path('members/add/', views.add_member_view, name='member_add'),
    path('members/view/<int:member_id>/', views.member_detail_view, name='member_detail'),
    path('api/members/<int:member_id>/', views.member_detail_api, name='member_detail_api'),
    path('api/members/<int:member_id>/update/', views.update_member, name='update_member'),
    
    path('transactions/', views.transactions_view, name='transactions'),
    path('api/transactions/issue/', TransactionViewSet.as_view({'post': 'issue_book'})),
    path('api/transactions/return/', TransactionViewSet.as_view({'post': 'return_book'})),
    
    path('settings/', views.settings_view, name='settings'),
    path('api/settings/update_settings/', SettingsViewSet.as_view({'put': 'update_settings'})),
]

# serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
