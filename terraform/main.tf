provider "azurerm" {
  features {}
  subscription_id = "dfa2542a-4d2c-4cde-a89b-161dbccd186f"
}

resource "azurerm_resource_group" "rg" {
  name     = "finance-rg"
  location = "East US"
}

default_node_pool {
  name       = "default"
  node_count = var.node_count
  vm_size    = "Standard_B2s"
}

