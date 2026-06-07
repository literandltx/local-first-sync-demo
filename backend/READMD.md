### Image build 
```bash
docker build -t local-first-backend .
```

### Run container
```bash
docker run -p 8080:8080 --name my-backend local-first-backend
```