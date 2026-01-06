# Personal Finance Manager (Flask + SQLite)

A full-stack **Personal Finance Manager** built with **Python, Flask, SQLite, and REST APIs**.  
This project was developed as part of a **Master’s-level Python course assignment** and demonstrates database management, API design, statistical analysis, and linear regression forecasting.

---

## 📌 Features

- SQLite database for persistent storage
- RESTful API using Flask
- CRUD operations for Accounts, Transactions, Income, Budgets
- Filter option and grapphical representations
- Statistical analysis (mean, median, min, max, std)
- Monthly income aggregation
- Linear regression–based income forecasting
- Input validation and error handling
- Beautiful HTML/JavaScript frontend

---

## 🗂️ Project Structure

```
project/
│
├── app.py
├── instance/
│   └── database.db
├── requirements.txt
├── README.md
├── templates/
│   └── dashboard.html
└── static/
    ├── script.js
    └── styles.css
```

---

## ⚙️ Installation and Run App

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

---

##  Example API Calls in Postan

### Load Account
```http Method: GET
   URL: http://127.0.0.1:5000/accounts
```
### Statistical Summary
```http Method: GET
   URL: http://127.0.0.1:5000/stats/summary/2025
```

### Create Transaction
```http Method: POST
   URL: http://127.0.0.1:5000/transactions

"header": [{ "key": "Content-Type", "value": "application/json" }],
"body": [{
    "account_id":1234,
    "amount":770,
    "date":"2025-12-08",
    "description":"Living"
}]
```

### Update Transaction
```http Method: PUT
   URL: http://127.0.0.1:5000/transactions

"header": [{ "key": "Content-Type", "value": "application/json" }],
"body": [{
    "id":"QZFC",
    "account_id":1234,
    "amount":790,
    "date":"2025-12-08",
    "description":"Living"
}]
```

### Create Budget
```http Method: POST
   URL: http://127.0.0.1:5000/budgets

"header": [{ "key": "Content-Type", "value": "application/json" }],
"body": [{
    "month_year":"2025-07",
    "amount":770,
    "notes":"all budgets"
}]
```

### Update Budget
```http Method: PUT
   URL: http://127.0.0.1:5000/budgets

"header": [{ "key": "Content-Type", "value": "application/json" }],
"body": [{
    "id": 4,
    "month_year":"2023-05",
    "amount":770,
    "notes":"Updated"

}]
```
### Delete Budget
```http Method: DELETE
   URL: http://127.0.0.1:5000/budgets

"header": [{ "key": "Content-Type", "value": "application/json" }],
"body": [{
    "id": 4
}]
```
### Load Monthly Incoe

```http Method: GET
   URL: http://127.0.0.1:5000/income/monthly/2025

```

---

## DevOps

```bash
git version
docker version
az version
kubectl version --client
terraform -version

docker build -t finance-app .
docker run -p 5000:5000 finance-app


kubectl create namespace monitoring
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl port-forward deployment/prometheus-grafana 3000:3000 -n monitoring

kubectl get secret -n monitoring prometheus-grafana -o yaml

```

