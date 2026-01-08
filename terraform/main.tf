provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
  subscription_id = "dfa2542a-4d2c-4cde-a89b-161dbccd186f"
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_kubernetes_cluster" "aks" {
  name                = "finance-aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "finance-ak-finance-rg-dfa254" # MUST MATCH YOUR PLAN'S OLD VALUE

  default_node_pool {
    name       = "nodepool1" # Change from "default" to "nodepool1"
    node_count = 1           # Match the current count of 1
    vm_size    = "Standard_B2s_v2" # Match the current VM size
  }

  identity {
    type = "SystemAssigned"
  }

}

# 1. Create the PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "db" {
  name                   = "finance-db-server-${random_integer.suffix.result}"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = "francecentral" # Hardcode this here
  version                = "14"
  administrator_login    = "psqladmin"
  administrator_password = "Password1234!" # In production, use a Secret!
  storage_mb             = 32768
  sku_name               = "B_Standard_B1ms" # Cheapest tier

  lifecycle {
    ignore_changes = [
      zone,
      high_availability[0].standby_availability_zone
    ]
  }
}

# 2. Create the specific database inside the server
resource "azurerm_postgresql_flexible_server_database" "financedb" {
  name      = "financedata"
  server_id = azurerm_postgresql_flexible_server.db.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# 3. Allow Azure services (AKS) to access the DB
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_access" {
  name             = "allow-azure-access"
  server_id        = azurerm_postgresql_flexible_server.db.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "random_integer" "suffix" {
  min = 10000
  max = 99999
}
