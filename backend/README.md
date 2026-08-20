# Django Admin — http://127.0.0.1:8000/admin/

- Công cụ quản trị backend có sẵn.
- Hữu ích cho developer/superuser, chỉnh dữ liệu nhanh, xử lý trường hợp khẩn cấp.
- Giao diện không đồng nhất với shop.

## khởi động backend

1. .\venv\Scripts\Activate.ps1
2. python manage.py runserver

## kiểm tra backend:

- python manage.py check

## test cho API quản trị đơn hàng

- chạy toàn bộ test trong thư mục orders: .\venv\Scripts\python.exe manage.py test orders
- chạy riêng file test: .\venv\Scripts\python.exe manage.py test orders.tests

## test cho API quản trị sản phẩm

- .\venv\Scripts\python.exe manage.py test products

## chạy toàn bộ test backend:

- .\venv\Scripts\python.exe manage.py test