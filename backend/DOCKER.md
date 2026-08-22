- docker run -d ` --name pgadmin ` -p 5050:80 ` -e PGADMIN_DEFAULT_EMAIL=williamli.sci@gmail.com ` -e
  PGADMIN_DEFAULT_PASSWORD_FILE=/run/secrets/pgadmin_password
  ` -v C:\Users\willi\pgadmin_password.txt:/run/secrets/pgadmin_password:ro ` dpage/pgadmin4