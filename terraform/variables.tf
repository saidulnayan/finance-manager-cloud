variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
  default     = "finance-rg"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "francecentral"
}

variable "aks_name" {
  description = "AKS cluster name"
  type        = string
  default     = "finance-aks"
}

variable "node_count" {
  description = "Number of AKS worker nodes"
  type        = number
  default     = 2
}
