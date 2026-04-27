from django.contrib import admin
from .models import Message, Thread
# Register your models here.

class MessageAdminInline(admin.StackedInline):
    model = Message
    extra = 0

class ThreadAdmin(admin.ModelAdmin):
    list_display = ('id',)
    inlines = [MessageAdminInline]


admin.site.register(Thread, ThreadAdmin)

