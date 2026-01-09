from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import random, string
from sqlalchemy import func, extract
import os

app = Flask(__name__)

# --- DATABASE CONNECTION ---
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_NAME = os.getenv('DB_NAME')

# This creates the connection string for Azure
app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}?sslmode=require"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- CORRECTED MODELS ---
class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(30), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    currency = db.Column(db.String(5), nullable=False)

class Transaction(db.Model):
    id = db.Column(db.String(4), primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    category = db.Column(db.String(20), default="Expense")
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(50))

class Budget(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    month_year = db.Column(db.String(7), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    notes = db.Column(db.String(40))

class Income(db.Model):
    id = db.Column(db.String(4), primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(20))

with app.app_context():
    db.create_all() # This creates the tables in Azure automatically!

# ================= UTIL =================

def generate_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

# ================= ROUTES =================

@app.route('/')
def index():
    return render_template('dashboard.html')

# ================= STATS =================

@app.route('/stats/summary/<int:year>')
def stats_summary(year):
    rows = db.session.query(
        extract('month', Income.date),
        func.sum(Income.amount)
    ).filter(
        extract('year', Income.date) == year
    ).group_by(extract('month', Income.date)).all()

    values = [float(r[1]) for r in rows if r[1] > 0]

    if not values:
        return jsonify({'mean':0,'median':0,'min':0,'max':0,'std':0})

    return jsonify({
        'mean': round(float(np.mean(values)), 2),
        'median': round(float(np.median(values)), 2),
        'min': round(float(min(values)), 2),
        'max': round(float(max(values)), 2),
        'std': round(float(np.std(values)), 2)
    })

# ================= FORECAST =================

@app.route('/stats/income_forecast/<int:year>')
def income_forecast(year):
    rows = db.session.query(
        extract('month', Income.date),
        func.sum(Income.amount)
    ).filter(
        extract('year', Income.date) == year
    ).group_by(extract('month', Income.date)).all()

    y = [float(r[1]) for r in rows if r[1] > 0]

    if len(y) < 2:
        return jsonify({'message': 'Not enough data'})

    X = np.arange(len(y)).reshape(-1, 1)
    model = LinearRegression().fit(X, y)
    pred = model.predict([[len(y)]])

    return jsonify({'prediction': round(float(pred[0]), 2)})


# --- Accounts ---
@app.route('/accounts', methods=['GET', 'POST', 'PUT', 'DELETE'])
def accounts():
    if request.method == 'POST':
        data = request.json
        # input validation
        if not (data['id'].isdigit() and len(data['id'])==4):
            return jsonify({'error':'ID must be 4 digits'}),400
        if not (data['name'].replace(' ','').isalpha() and len(data['name'])<=30):
            return jsonify({'error':'Name must be letters/spaces max 30'}),400
        if data['currency']!='HUF':
            return jsonify({'error':'Only HUF currency allowed'}),400
        acc = Account(id=int(data['id']), name=data['name'], type=data['type'], currency=data['currency'])
        db.session.add(acc)
        db.session.commit()
        return jsonify({'message':'Account created'})
    
    elif request.method == 'GET':
        accounts = Account.query.all()
        return jsonify([{'id':a.id,'name':a.name,'type':a.type,'currency':a.currency} for a in accounts])
   
    elif request.method=='DELETE':
        acc_id = request.json['id']
        used_tx = Transaction.query.filter_by(account_id=acc_id).first()
        used_inc = Income.query.filter_by(account_id=acc_id).first()

        if used_tx or used_inc:
            return jsonify({'error':'Sorry! Account is already in use. You can not delete it.'}), 400

        Account.query.filter_by(id=acc_id).delete()
        db.session.commit()
        return jsonify({'message':'Account deleted'})
    
    elif request.method=='PUT':
        data = request.json
        acc = Account.query.filter_by(id=data['id']).first()
        if not acc:
            return jsonify({'error':'Account not found'}),404
        acc.name=data['name']; acc.type=data['type']; acc.currency=data['currency']
        db.session.commit()
        return jsonify({'message':'Account updated'})

# --- Transactions ---
@app.route('/transactions', methods=['GET','POST','PUT','DELETE'])
def transactions():
    if request.method == 'GET':
        txs = Transaction.query.all()
        return jsonify([
            {
                'id': t.id,
                'account_id': t.account_id,
                'amount': t.amount,
                'date': str(t.date),
                'category': t.category,
                'description': t.description
            } for t in txs
        ])

    data = request.json

    # ---------- CREATE ----------
    if request.method == 'POST':
        
        acc = Account.query.get(data['account_id'])
        if not acc:
            return jsonify({'error':'Account ID not found'}),400

        if data['amount'] <= 0:
            return jsonify({'error':'Amount must be positive'}),400

        tx_id = generate_id()
        tx = Transaction(
            id=tx_id,
            account_id=data['account_id'],
            amount=data['amount'],
            date=datetime.strptime(data['date'],'%Y-%m-%d').date(),
            category="Expense",
            description=data.get('description'))
        
        db.session.add(tx)
        db.session.commit()
        return jsonify({'message':'Transaction created'})

    # ---------- UPDATE ----------
    if request.method == 'PUT':
        t = Transaction.query.get(data['id'])
        if not t:
            return jsonify({'error':'Transaction not found'}),404

        if not Account.query.get(data['account_id']):
            return jsonify({'error':'Account ID not found'}),400

        if data['amount'] <= 0:
            return jsonify({'error':'Amount must be positive'}),400
        
        if not data.get('date'):
            return jsonify({'error': 'Date is required'}), 400

        t.account_id = data['account_id']
        t.amount = data['amount']
        t.description = data.get('description')

        db.session.commit()
        return jsonify({'message':'Transaction updated'})

    # ---------- DELETE ----------
    if request.method == 'DELETE':
        t = Transaction.query.get(data['id'])
        if not t:
            return jsonify({'error':'Transaction not found'}),404

        db.session.delete(t)
        db.session.commit()
        return jsonify({'message':'Transaction deleted'})


@app.route('/transactions/<int:tx_id>')
def get_transaction(tx_id):
    tx = Transaction.query.get(tx_id)
    if not tx:
        return jsonify({'error': 'Not found'}), 404

    return jsonify({
        'id': tx.id,
        'account_id': tx.account_id,
        'amount': tx.amount,
        'date': tx.date,
        'description': tx.description
    })


# --- Budgets ---

@app.route('/budgets', methods=['GET','POST','PUT','DELETE'])
def budgets():
    # ---------- GET ----------
    if request.method == 'GET':
        budgets = Budget.query.all()
        return jsonify([
            {
                'id': b.id,
                'month_year': b.month_year,
                'amount': b.amount,
                'notes': b.notes
            } for b in budgets
        ])

    data = request.json

    # ---------- CREATE ----------
    if request.method == 'POST':
        if data['amount'] <= 0:
            return jsonify({'error':'Amount must be positive'}),400

        existing = Budget.query.filter_by(month_year=data['month_year']).first()
        if existing:
            return jsonify({'error':'Monthly budget already exists'}),400

        b = Budget(
            month_year=data['month_year'],
            amount=data['amount'],
            notes=data.get('notes','')
        )
        db.session.add(b)
        db.session.commit()
        return jsonify({'message':'Budget created Successfully!'})

    # ---------- UPDATE ----------
    if request.method == 'PUT':
        b = Budget.query.get(data['id'])
        if not b:
            return jsonify({'error':'Budget not found'}),404

        if data['amount'] <= 0:
            return jsonify({'error':'Amount must be positive'}),400

        # prevent duplicate month on update
        dup = Budget.query.filter(
            Budget.month_year == data['month_year'],
            Budget.id != data['id']
        ).first()
        if dup:
            return jsonify({'error':'Monthly budget already exists'}),400

        b.month_year = data['month_year']
        b.amount = data['amount']
        b.notes = data.get('notes','')
        db.session.commit()
        return jsonify({'message':'Budget updated successfully!'})

    # ---------- DELETE ----------
    if request.method == 'DELETE':
        b = Budget.query.get(data['id'])
        if not b:
            return jsonify({'error':'Budget not found'}),404

        db.session.delete(b)
        db.session.commit()
        return jsonify({'message':'Budget deleted'})


# ------- Income --------------

@app.route('/income', methods=['GET','POST','PUT','DELETE'])

def income():
    if request.method=='POST':
        data = request.json
        if not Account.query.filter_by(id=data['account_id']).first():
            return jsonify({'error':'Account ID not found'}),400
        inc_id = generate_id()
        inc = Income(id=inc_id, account_id=data['account_id'], date=datetime.strptime(data['date'],'%Y-%m-%d').date(),
                     amount=data['amount'], source=data['source'])
        db.session.add(inc); db.session.commit()
        return jsonify({'message':'Income added','id':inc_id})
    elif request.method=='GET':
        incs = Income.query.all()
        return jsonify([{'id':i.id,'account_id':i.account_id,'date':str(i.date),'amount':i.amount,'source':i.source} for i in incs])

    elif request.method=='PUT':
        data=request.json
        
        if not Account.query.filter_by(id=data['account_id']).first():
            return jsonify({'error':'Account ID not found'}), 400

        inc = Income.query.get(data['id'])
        if not inc:
            return jsonify({'error':'Income not found'}), 404

        if data['amount'] <= 0:
            return jsonify({'error':'Amount must be positive'}), 400

        inc.account_id = data['account_id']
        inc.amount = data['amount']
        inc.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        inc.source = data['source']

        db.session.commit()
        return jsonify({'message':'Income updated'})

    elif request.method=='DELETE':
        Income.query.filter_by(id=request.json['id']).delete()
        db.session.commit()
        return jsonify({'message':'Income deleted'})
    
def update_income():
    data = request.json
    inc = Income.query.get(data['id'])

    if not inc:
        return jsonify({'error': 'Income not found'}), 404

    inc.account_id = data['account_id']
    inc.amount = data['amount']
    inc.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    inc.source = data['source']

    db.session.commit()
    return jsonify({'message': 'Income updated successfully'})

# ================= YEARS =================

@app.route('/income/years')
def income_years():
    years = db.session.query(extract('year', Income.date)).distinct().all()
    return jsonify(sorted([int(y[0]) for y in years if y[0] is not None]))

# ================= MONTHLY BY YEAR =================

@app.route('/income/monthly/<int:year>')
def income_by_year(year):
    rows = db.session.query(
        extract('month', Income.date),
        func.sum(Income.amount)
    ).filter(
        extract('year', Income.date) == year
    ).group_by(extract('month', Income.date)).all()

    months = {str(i).zfill(2): 0 for i in range(1, 13)}
    for m, total in rows:
        months[m] = float(total) 

    return jsonify(list(months.values()))

# ----- Filter Income ------
@app.route('/income/filter/<int:year>/<int:month>')
def filter_income(year, month):
    incomes = Income.query.filter(
        db.extract('year', Income.date) == year,
        db.extract('month', Income.date) == month
    ).all()

    return jsonify([
        {'id':i.id,'account_id':i.account_id,'amount':i.amount,
         'date':str(i.date),'source':i.source}
        for i in incomes
    ])


# --- Balance ---
@app.route('/balance')
def balance():
    accounts = Account.query.all()
    result = []

    for a in accounts:
        income_sum = db.session.query(db.func.sum(Income.amount))\
            .filter(Income.account_id == a.id).scalar() or 0

        expense_sum = db.session.query(db.func.sum(Transaction.amount))\
            .filter(Transaction.account_id == a.id).scalar() or 0

        result.append({
            'account_id': a.id,
            'account_name': a.name,
            'total_income': income_sum,
            'total_expense': expense_sum,
            'balance': income_sum - expense_sum
        })

    return jsonify(result)


# --- Savings ---
@app.route('/savings')
def savings():
    budgets = Budget.query.all()
    savings_list = []
    for b in budgets:
        # month = b.month_year
        year,month = map(int, b.month_year.split('-'))
        budget_amount = b.amount
        # total expenses in that month
        expenses = Transaction.query.filter(extract('year',Transaction.date)== year, extract('month', Transaction.date)==month).all()
            
        # Transaction.date.like(f"{month}-%")).all()
        total_exp = sum(e.amount for e in expenses)
        savings_list.append({'month_year':b.month_year,'savings':budget_amount-total_exp,'currency':'HUF'})
    return jsonify(savings_list)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
