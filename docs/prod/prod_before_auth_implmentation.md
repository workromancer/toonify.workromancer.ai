# **GCP Private Backend 아키텍처를 위한 코드 준비 가이드**

이 문서는 **Next.js(Public)**와 **FastAPI(Private)** 구조에서 트래픽 흐름을 제어하고, 환경 차이(Local vs GCP)를 처리하기 위한 코드 변경 사항을 다룹니다.

## **1. Frontend (Next.js) 준비 사항**

**핵심 과제:** 브라우저(Client)는 Private Backend(FastAPI)에 직접 접근할 수 없습니다. 따라서 Next.js 서버가 **중계자(BFF: Backend for Frontend)** 역할을 해야 합니다.

### **A. 환경 변수 분리 (.env)**

클라이언트용 변수와 서버용 변수를 명확히 구분해야 합니다.

```
# .env.local (로컬 개발)  
# 브라우저가 접근 가능한 Next.js 내부 API 주소  
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api 

# Next.js 서버가 실제로 호출할 백엔드 주소  
INTERNAL_BACKEND_URL=http://localhost:8000 

# Cloud Run (배포 환경 변수)  
NEXT_PUBLIC_API_BASE_URL=[https://my-frontend.run.app/api](https://my-frontend.run.app/api)  
INTERNAL_BACKEND_URL=[https://my-backend-hash.a.run.app](https://my-backend-hash.a.run.app) # (Private URL)
```

### **B. API Route (Proxy) 구현 (App Router 예시)**

브라우저에서 직접 FastAPI를 호출하는 대신, Next.js의 Route Handler를 통해 요청을 토스합니다.

**파일 경로:** app/api/[...path]/route.ts (모든 /api/* 요청을 가로챔)
```
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL;

async function proxyRequest(request: NextRequest) {  
  // 1. 요청 경로 추출 (/api/users -> /users)  
  const path = request.nextUrl.pathname.replace('/api', '');  
    
  // 2. 백엔드로 요청 전달 (Server-to-Server 통신)  
  // Cloud Run 간 통신은 자동으로 IAM 인증을 타거나,   
  // 내부망(Private VPC)을 통하므로 별도 인증 헤더 없이도 호출 가능(설정에 따라 다름)  
  const res = await fetch(`${BACKEND_URL}${path}${request.nextUrl.search}`, {  
    method: request.method,  
    headers: {  
      'Content-Type': 'application/json',  
      // 필요하다면 클라이언트의 Auth Token을 전달  
      ...(request.headers.get('Authorization') ? { 'Authorization': request.headers.get('Authorization')! } : {}),  
    },  
    body: request.body,  
    // 중요: Next.js 캐싱 방지 (API 데이터이므로)  
    cache: 'no-store',   
  });

  const data = await res.json();  
  return NextResponse.json(data, { status: res.status });  
}

export { proxyRequest as GET, proxyRequest as POST, proxyRequest as PUT, proxyRequest as DELETE };
```
### **C. 클라이언트 호출 코드**

클라이언트 컴포넌트(useEffect 등)에서는 이제 **Next.js의 주소**를 바라봅니다.
```
// src/components/UserProfile.tsx  
// 변경 전 (로컬에서만 작동, 배포 시 실패)  
// fetch('http://localhost:8000/users/me') 

// 변경 후 (Next.js API Route를 호출 -> Next.js 서버가 백엔드 호출)  
fetch('/api/users/me') 
```

## **2. Backend (FastAPI) 준비 사항**

**핵심 과제:** 스토리지(MinIO vs GCS)와 DB 연결(Local vs Cloud SQL)을 환경에 따라 유연하게 교체할 수 있어야 합니다.

### **A. Database 연결 설정 (database.py)**

Cloud SQL은 소켓 연결이나 Private IP 연결을 사용합니다. 환경 변수로 제어합니다.
```python
import os  
from sqlalchemy import create_engine

# 환경 변수에서 DB 정보 로드  
DB_USER = os.getenv("DB_USER", "postgres")  
DB_PASS = os.getenv("DB_PASS", "password")  
DB_NAME = os.getenv("DB_NAME", "myapp")  
DB_HOST = os.getenv("DB_HOST", "localhost") # 로컬은 localhost, GCP는 Private IP (예: 10.58.0.3)

# PostgreSQL URL 구성  
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

engine = create_engine(DATABASE_URL)
```
### **B. Storage 추상화 (Adapter Pattern)**

MinIO와 GCS 코드를 if/else로 여기저기 섞지 말고, 하나의 인터페이스로 만드세요.

**파일:** services/storage.py
```python
import os  
from abc import ABC, abstractmethod

class StorageService(ABC):  
    @abstractmethod  
    def upload_file(self, file_data, destination: str):  
        pass


# 1. GCS 구현체 (배포용)  
class GCSStorage(StorageService):  
    def __init__(self):  
        from google.cloud import storage  
        self.client = storage.Client() # ADC(Application Default Credentials) 자동 사용  
        self.bucket_name = os.getenv("GCS_BUCKET_NAME")  
        self.bucket = self.client.bucket(self.bucket_name)

    def upload_file(self, file_data, destination: str):  
        blob = self.bucket.blob(destination)  
        blob.upload_from_file(file_data)  
        return blob.public_url

# 2. MinIO 구현체 (로컬용)  
class MinIOStorage(StorageService):  
    def __init__(self):  
        from minio import Minio  
        self.client = Minio(  
            os.getenv("MINIO_ENDPOINT", "localhost:9000"),  
            access_key=os.getenv("MINIO_ACCESS_KEY"),  
            secret_key=os.getenv("MINIO_SECRET_KEY"),  
            secure=False  
        )  
        self.bucket_name = os.getenv("MINIO_BUCKET_NAME", "local-bucket")

    def upload_file(self, file_data, destination: str):  
        self.client.put_object(  
            self.bucket_name, destination, file_data, length=-1, part_size=10*1024*1024  
        )  
        return f"http://localhost:9000/{self.bucket_name}/{destination}"

# 3. 팩토리 (환경에 따라 선택)  
def get_storage_service() -> StorageService:  
    env = os.getenv("APP_ENV", "local")  
    if env == "production":  
        return GCSStorage()  
    return MinIOStorage()
```

### **C. Vertex AI 연동**

Vertex AI는 별도의 API 키보다 GCP IAM 권한을 사용합니다.  
로컬에서는 gcloud auth application-default login 명령어로 인증하고, Cloud Run에서는 서비스 계정이 자동으로 처리하므로 코드는 동일합니다.  
```python
import vertexai  
from vertexai.preview.generative_models import GenerativeModel

def init_ai():  
    # 프로젝트 ID와 리전만 설정하면 됨  
    vertexai.init(project=os.getenv("GCP_PROJECT_ID"), location="global")  
    model = GenerativeModel("gemini-3-pro-preview")  
    return model
```

## **3. Dockerfile 최적화 (Cloud Run용)**

Cloud Run은 **PORT 환경 변수** (기본값 8080)를 주입하므로, 앱이 이 포트에서 수신 대기하도록 설정해야 합니다.

### **FastAPI Dockerfile**

```dockerfile
FROM python:3.9-slim

WORKDIR /app  
COPY requirements.txt .  
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 중요: Cloud Run은 $PORT 환경변수를 주입함. CMD에서 이를 사용해야 함.  
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### **Next.js Dockerfile (Standalone)**

Next.js는 output: 'standalone' 설정을 next.config.js에 추가하면 이미지 크기를 대폭 줄일 수 있습니다.

```
// next.config.js  
module.exports = {  
  output: 'standalone',  
  // ...  
}
```

## **4. 요약 체크리스트**

1. **Next.js API Routes**: 브라우저 -> Next.js 서버 -> FastAPI 흐름을 위한 Proxy 로직 작성 완료하기.  
2. **FastAPI CORS**: 프록시를 통하더라도, 혹시 모를 상황에 대비해 CORSMiddleware에 Frontend 도메인(Cloud Run URL) 허용 추가.  
3. **환경 변수 관리**:  
   * INTERNAL_BACKEND_URL: Next.js 서버가 내부망으로 백엔드를 찾을 주소.  
   * DB_HOST: 로컬은 localhost, 배포는 Private IP.  
   * APP_ENV: 스토리지 클래스(MinIO/GCS)를 결정할 플래그.  
4. **Google 라이브러리 추가**: requirements.txt에 google-cloud-storage, google-cloud-aiplatform, uvicorn, gunicorn 추가.