output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}

output "resource_group" {
  value = azurerm_resource_group.rg.name
}

output "kubeconfig_command" {
  value = "az aks get-credentials --resource-group ${azurerm_resource_group.rg.name} --name ${azurerm_kubernetes_cluster.aks.name}"
}

output "postgresql_server_name" {
  description = "The name of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.db.name
}

output "postgresql_server_fqdn" {
  description = "The Fully Qualified Domain Name of the PostgreSQL Server"
  value       = azurerm_postgresql_flexible_server.db.fqdn
}