from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify

class Course(models.Model):
    DIFFICULTY_CHOICES = [
        ('beginner', 'مبتدئ'),
        ('intermediate', 'متوسط'),
        ('advanced', 'متقدم'),
    ]

    title = models.CharField(max_length=255, verbose_name="عنوان الدورة")
    slug = models.SlugField(unique=True, verbose_name="رابط الدورة")
    description = models.TextField(verbose_name="وصف الدورة")
    thumbnail = models.ImageField(upload_to='academy/thumbnails/', blank=True, null=True, verbose_name="صورة الدورة")
    estimated_duration = models.CharField(max_length=50, verbose_name="الوقت المقدر (مثلاً: 2 ساعة)")
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner', verbose_name="المستوى")
    is_published = models.BooleanField(default=True, verbose_name="منشور")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        verbose_name = "دورة تدريبية"
        verbose_name_plural = "الدورات التدريبية"

    def __str__(self):
        return self.title

    def get_progress_for_user(self, user):
        """Calculate percentage completion for a user."""
        total_lessons = Lesson.objects.filter(chapter__course=self).count()
        if total_lessons == 0:
            return 0
        completed_lessons = UserLessonProgress.objects.filter(
            user=user, 
            lesson__chapter__course=self, 
            is_completed=True
        ).count()
        return round((completed_lessons / total_lessons) * 100)

class Chapter(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='chapters', verbose_name="الدورة")
    title = models.CharField(max_length=255, verbose_name="عنوان الفصل")
    order = models.PositiveIntegerField(default=0, verbose_name="الترتيب")

    class Meta:
        app_label = 'core'
        verbose_name = "فصل"
        verbose_name_plural = "الفصول"
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Lesson(models.Model):
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='lessons', verbose_name="الفصل")
    title = models.CharField(max_length=255, verbose_name="عنوان الدرس")
    content = models.TextField(verbose_name="محتوى الدرس (Markdown)")
    video_id = models.CharField(max_length=100, blank=True, null=True, verbose_name="معرف فيديو يوتيوب")
    order = models.PositiveIntegerField(default=0, verbose_name="الترتيب")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        verbose_name = "درس"
        verbose_name_plural = "الدروس"
        ordering = ['order']

    def __str__(self):
        return f"{self.chapter.title} - {self.title}"

    def is_completed_by(self, user):
        return UserLessonProgress.objects.filter(user=user, lesson=self, is_completed=True).exists()

class UserLessonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='academy_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'core'
        unique_together = ('user', 'lesson')
        verbose_name = "تقدم الدرس"
        verbose_name_plural = "تقدم الدروس"

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title}"
