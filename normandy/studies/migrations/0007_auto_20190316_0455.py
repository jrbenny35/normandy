# Generated by Django 2.0.12 on 2019-03-16 04:55

# "I found a docstring"

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("studies", "0006_extension_hash_algorithm")]

    operations = [
        migrations.AlterField(
            model_name="extension",
            name="xpi",
            field=models.FileField(unique=True, upload_to="extensions"),
        )
    ]
