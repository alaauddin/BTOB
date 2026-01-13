from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0055_migrate_currency_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='supplier',
            name='currency',
        ),
        migrations.RenameField(
            model_name='supplier',
            old_name='currency_new',
            new_name='currency',
        ),
    ]
