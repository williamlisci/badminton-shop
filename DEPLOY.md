- Kết nối Django với Neon, migrate schema: `python manage.py migrate`
- Tạo superuser trên Neon sau khi import dữ liệu người dùng (hoặc chỉ tạo trước nếu Neon chưa có dữ liệu người dùng):
  `python manage.py createsuperuser`
- Test collectstatic: `python manage.py collectstatic --noinput`
- Export dữ liệu tất cả từ local vào file json:
  `python manage.py dumpdata products accounts orders --indent 2 --exclude auth.permission --exclude contenttypes --output data.json`
- import vào neon: `python manage.py loaddata data.json`
- Đổi `.env` sang Neon, sau đó nạp fixture:
  `python manage.py loaddata data.json --verbosity 2`
- đọc file ảnh local, re-upload lên Cloudinary, update lại Neon: python manage.py reupload_images
- Trên Render bắt buộc khai báo `CLOUDINARY_URL` đúng dạng `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`.
- Sau khi cập nhật cấu hình, redeploy Render và kiểm tra API phải trả URL bắt đầu bằng `https://res.cloudinary.com/`, không phải `/media/`.
