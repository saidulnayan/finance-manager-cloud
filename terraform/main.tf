provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "finance-rg"
  location = "East US"
}