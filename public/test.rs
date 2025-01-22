fn max_subarray_sum(arr: &[i32]) -> i32 {
    let mut max_sum = arr[0];
    let mut current_sum = arr[0];
    for i in 1..arr.len() {
        current_sum = current_sum.max(arr[i]);
        max_sum = max_sum.max(current_sum);
    }
    max_sum
}

fn main() {
    let arr = [1, -2, 13, 10, -4, 7, 2, -5];
    let max_sum = max_subarray_sum(&arr);
    println!("The maximum sum of any contiguous subarray is {}", max_sum);
}