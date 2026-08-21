#!/usr/bin/env bash
# Thoát ngay nếu có lỗi xảy ra
set -o errexit

# Cài đặt các thư viện từ requirements.txt
pip install -r requirements.txt

# Gom các file static (css, js...) của Django
python manage.py collectstatic --no-input

# Tự động cập nhật database lên Neon
python manage.py migrate
