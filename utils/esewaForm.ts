// src/utils/esewaForm.ts

export function submitEsewaForm(
  data: Record<string, any>,
  actionUrl: string = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = actionUrl;

  // eSewa EPAY v2 strict payload definition
  const esewaFields: Record<string, string> = {
    amount: String(data.amount ?? "0"),
    tax_amount: String(data.tax_amount ?? "0"),
    total_amount: String(data.total_amount ?? data.amount ?? "0"),
    transaction_uuid: String(data.transaction_uuid ?? ""),
    product_code: String(data.product_code ?? ""),
    product_service_charge: String(data.product_service_charge ?? "0"),
    product_delivery_charge: String(data.product_delivery_charge ?? "0"),
    success_url: String(data.success_url ?? ""),
    failure_url: String(data.failure_url ?? ""),
    signed_field_names: String(data.signed_field_names ?? "total_amount,transaction_uuid,product_code"),
    signature: String(data.signature ?? ""),
  };

  // Append only the valid eSewa fields
  Object.entries(esewaFields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}