from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from core.decorators import merchant_required
from core.models import Course, Chapter, Lesson, UserLessonProgress
import markdown

@merchant_required
def academy_home(request):
    courses = Course.objects.filter(is_published=True)
    for course in courses:
        course.progress = course.get_progress_for_user(request.user)
    
    return render(request, 'academy/home.html', {
        'courses': courses,
        'nav_state': 'merchant',
    })

@merchant_required
def course_detail(request, slug):
    course = get_object_or_404(Course, slug=slug, is_published=True)
    chapters = course.chapters.all().prefetch_related('lessons')
    
    for chapter in chapters:
        for lesson in chapter.lessons.all():
            lesson.is_completed = lesson.is_completed_by(request.user)
            
    progress = course.get_progress_for_user(request.user)
    
    return render(request, 'academy/course_detail.html', {
        'course': course,
        'chapters': chapters,
        'progress': progress,
        'nav_state': 'merchant',
    })

@merchant_required
def lesson_view(request, course_slug, lesson_id):
    course = get_object_or_404(Course, slug=course_slug, is_published=True)
    lesson = get_object_or_404(Lesson, id=lesson_id, chapter__course=course)
    
    # Get next/previous lessons
    all_lessons = list(Lesson.objects.filter(chapter__course=course).order_by('chapter__order', 'order'))
    current_index = all_lessons.index(lesson)
    
    next_lesson = all_lessons[current_index + 1] if current_index + 1 < len(all_lessons) else None
    prev_lesson = all_lessons[current_index - 1] if current_index > 0 else None
    
    # Convert markdown to HTML
    lesson_html = markdown.markdown(lesson.content, extensions=['extra', 'codehilite'])
    
    is_completed = lesson.is_completed_by(request.user)
    
    return render(request, 'academy/lesson_view.html', {
        'course': course,
        'lesson': lesson,
        'lesson_html': lesson_html,
        'next_lesson': next_lesson,
        'prev_lesson': prev_lesson,
        'is_completed': is_completed,
        'chapters': course.chapters.all().prefetch_related('lessons'),
        'nav_state': 'merchant',
    })

@merchant_required
def complete_lesson(request, lesson_id):
    lesson = get_object_or_404(Lesson, id=lesson_id)
    progress, created = UserLessonProgress.objects.get_or_create(
        user=request.user,
        lesson=lesson
    )
    if not progress.is_completed:
        progress.is_completed = True
        progress.completed_at = timezone.now()
        progress.save()
        
    return JsonResponse({'success': True})
