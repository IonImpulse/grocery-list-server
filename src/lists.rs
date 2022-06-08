use crate::*;
use serde_derive::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct GroceryList {
    id: i32,
    name: String,
    items: Vec<GroceryListItem>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct GroceryListItem {
    name: String,
    quantity: Option<u64>,
    crossed_off: bool,
}
