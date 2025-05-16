"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import {
  Download,
  Mail,
  Save,
  Printer,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formSchema = z.object({
  clientName: z.string().min(2, { message: "Client name is required" }),
  companyName: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(10, { message: "Phone number is required" }),
  billingAddress: z.string().min(5, { message: "Billing address is required" }),
  invoiceNumber: z.string().min(1, { message: "Invoice number is required" }),
  invoiceDate: z.string().min(1, { message: "Invoice date is required" }),
  dueDate: z.string().min(1, { message: "Due date is required" }),
  paymentTerms: z.string().min(1, { message: "Payment terms are required" }),
  taxRate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).max(100),
  paidAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
  currency: z.string().nonempty(),
});

type InvoiceItem = {
  id: string;
  description: string;
  serviceType: string;
  quantity: number;
  rate: number;
  total: number;
};

export default function InvoiceForm() {
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: uuidv4(),
      description: "",
      serviceType: "Website Development",
      quantity: 1,
      rate: 0,
      total: 0,
    },
  ]);

  const [pricingMode, setPricingMode] = useState("hourly");
  const [darkMode, setDarkMode] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [activeTab, setActiveTab] = useState("edit");

  const form = useForm<z.infer<typeof formSchema>, any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      companyName: "",
      email: "",
      phone: "",
      billingAddress: "",
      invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
      invoiceDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(
        new Date(new Date().setDate(new Date().getDate() + 30)),
        "yyyy-MM-dd"
      ),
      paymentTerms: "Net 30",
      taxRate: 0,
      discount: 0,
      paidAmount: 0,
      notes:
        "Thank you for your business!\n\nPayment Information:\nAccount Title: HumAi Online Marketing\nAccount Number: 1916290092222\nBank: United Bank Limited",
      currency: "USD",
    },
  });

  const watchTaxRate = form.watch("taxRate");
  const watchDiscount = form.watch("discount");
  const watchPaidAmount = form.watch("paidAmount");
  const watchCurrency = form.watch("currency");

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const taxAmount = (subtotal * watchTaxRate) / 100;
  const discountAmount = (subtotal * watchDiscount) / 100;
  const total = subtotal + taxAmount - discountAmount;
  const balanceDue = total - Number(form.getValues("paidAmount"));

  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    PKR: "₨",
  };

  const formatCurrency = (amount: any) => {
    // Ensure amount is a number
    const numAmount = typeof amount === "number" ? amount : 0;
    return `${currencySymbols[watchCurrency] || "$"}${numAmount.toFixed(2)}`;
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: uuidv4(),
        description: "",
        serviceType: "Website Development",
        quantity: 1,
        rate: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate total if quantity or rate changes
          if (field === "quantity" || field === "rate") {
            updatedItem.total = updatedItem.quantity * updatedItem.rate;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById("invoice-preview");
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice-${form.getValues("invoiceNumber")}.pdf`);
  };

  const emailInvoice = () => {
    const emailSubject = `Invoice ${form.getValues(
      "invoiceNumber"
    )} from Humai Webs`;
    const emailBody = `Dear ${form.getValues("clientName")},

Please find attached your invoice ${form.getValues(
      "invoiceNumber"
    )} for ${formatCurrency(total)}.

Payment is due by ${form.getValues("dueDate")}.

Thank you for your business!

Humai Webs`;

    window.location.href = `mailto:${form.getValues(
      "email"
    )}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
      emailBody
    )}`;
  };

  const resetForm = () => {
    form.reset();
    setItems([
      {
        id: uuidv4(),
        description: "",
        serviceType: "Website Development",
        quantity: 1,
        rate: 0,
        total: 0,
      },
    ]);
    setLogoUrl("");
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data, items);
    // Here you would typically save the invoice data to your backend
    alert("Invoice saved successfully!");
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-white dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-[#005587] dark:text-white">
              Invoice Generator
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  aria-label="Toggle dark mode"
                />
                <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <Button variant="outline" onClick={resetForm}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          <Tabs
            defaultValue="edit"
            value={activeTab}
            onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="edit">Edit Invoice</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Client Details Section */}
                    <Card>
                      <CardContent className="pt-6">
                        <h2 className="text-xl font-semibold mb-4 text-[#005587] dark:text-white">
                          Client Details
                        </h2>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="clientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Client Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="ABC Company" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="client@example.com"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="+1 234 567 8900"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="billingAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Billing Address</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="123 Main St, City, Country"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Invoice Information Section */}
                    <Card>
                      <CardContent className="pt-6">
                        <h2 className="text-xl font-semibold mb-4 text-[#005587] dark:text-white">
                          Invoice Information
                        </h2>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="invoiceNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Invoice Number</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="invoiceDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Invoice Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Due Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="paymentTerms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Payment Terms</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select payment terms" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Net 7">Net 7</SelectItem>
                                    <SelectItem value="Net 15">
                                      Net 15
                                    </SelectItem>
                                    <SelectItem value="Net 30">
                                      Net 30
                                    </SelectItem>
                                    <SelectItem value="Net 60">
                                      Net 60
                                    </SelectItem>
                                    <SelectItem value="Due on Receipt">
                                      Due on Receipt
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Currency</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="PKR">PKR (₨)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div>
                            <Label>Company Logo</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pricing Structure Switch */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-[#005587] dark:text-white">
                          Pricing Structure
                        </h2>
                        <div className="flex items-center space-x-4">
                          <Label
                            htmlFor="pricing-mode"
                            className={`cursor-pointer ${
                              pricingMode === "hourly"
                                ? "font-bold text-[#005587] dark:text-white"
                                : ""
                            }`}>
                            Price per Hour
                          </Label>
                          <Switch
                            id="pricing-mode"
                            checked={pricingMode === "item"}
                            onCheckedChange={(checked) =>
                              setPricingMode(checked ? "item" : "hourly")
                            }
                          />
                          <Label
                            htmlFor="pricing-mode"
                            className={`cursor-pointer ${
                              pricingMode === "item"
                                ? "font-bold text-[#005587] dark:text-white"
                                : ""
                            }`}>
                            Price per Item/Project
                          </Label>
                        </div>
                      </div>

                      {/* Itemized Billing Table */}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead>Service Type</TableHead>
                              <TableHead>
                                {pricingMode === "hourly"
                                  ? "Hours"
                                  : "Quantity"}
                              </TableHead>
                              <TableHead>
                                {pricingMode === "hourly"
                                  ? "Rate/Hour"
                                  : "Rate"}
                              </TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Input
                                    value={item.description}
                                    onChange={(e) =>
                                      updateItem(
                                        item.id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Description of work"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={item.serviceType}
                                    onValueChange={(value) =>
                                      updateItem(item.id, "serviceType", value)
                                    }>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Website Development">
                                        Website Development
                                      </SelectItem>
                                      <SelectItem value="Graphics Designing">
                                        Graphics Designing
                                      </SelectItem>
                                      <SelectItem value="SEO">SEO</SelectItem>
                                      <SelectItem value="Mobile App Development">
                                        Mobile App Development
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateItem(
                                        item.id,
                                        "quantity",
                                        Number.parseFloat(e.target.value) || 0
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.rate}
                                    onChange={(e) =>
                                      updateItem(
                                        item.id,
                                        "rate",
                                        Number.parseFloat(e.target.value) || 0
                                      )
                                    }
                                    placeholder="0.00"
                                  />
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(item.total)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                    disabled={items.length === 1}>
                                    ×
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItem}
                        className="mt-4">
                        Add Item
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Payment Summary Section */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4 text-[#005587] dark:text-white">
                        Payment Summary
                      </h2>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span>Tax Rate:</span>
                            <FormField
                              control={form.control}
                              name="taxRate"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-20"
                                      {...field}
                                    />
                                  </FormControl>
                                  <span>%</span>
                                </FormItem>
                              )}
                            />
                          </div>
                          <span>{formatCurrency(taxAmount)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span>Discount:</span>
                            <FormField
                              control={form.control}
                              name="discount"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-20"
                                      {...field}
                                    />
                                  </FormControl>
                                  <span>%</span>
                                </FormItem>
                              )}
                            />
                          </div>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>

                        <Separator />

                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>{formatCurrency(total)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span>Amount Paid:</span>
                            <FormField
                              control={form.control}
                              name="paidAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-32"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <span>{formatCurrency(watchPaidAmount)}</span>
                        </div>

                        <Separator />

                        <div className="flex justify-between text-lg font-bold">
                          <span>Balance Due:</span>
                          <span className="text-[#005587] dark:text-white">
                            {formatCurrency(balanceDue)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes Section */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4 text-[#005587] dark:text-white">
                        Notes / Additional Information
                      </h2>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Enter any additional notes or payment instructions here..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4">
                    <Button
                      type="submit"
                      className="bg-[#005587] hover:bg-[#004570]">
                      <Save className="h-4 w-4 mr-2" />
                      Save Invoice
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={emailInvoice}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email Invoice
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="preview">
              <div
                id="invoice-preview"
                className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto print:shadow-none">
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    {logoUrl ? (
                      <img
                        src={logoUrl || "/placeholder.svg"}
                        alt="Company Logo"
                        className="h-16 mb-2"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-[#005587]">
                        Humai Webs
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#005587]">
                      INVOICE
                    </div>
                    <div className="text-gray-600">
                      #{form.getValues("invoiceNumber")}
                    </div>
                    <div className="text-gray-600 mt-2">
                      Date:{" "}
                      {format(
                        new Date(form.getValues("invoiceDate")),
                        "MMMM dd, yyyy"
                      )}
                    </div>
                    <div className="text-gray-600">
                      Due:{" "}
                      {format(
                        new Date(form.getValues("dueDate")),
                        "MMMM dd, yyyy"
                      )}
                    </div>
                  </div>
                </div>

                {/* Client and Company Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <div className="text-sm font-semibold text-gray-500 mb-1">
                      Bill To:
                    </div>
                    <div className="font-bold">
                      {form.getValues("clientName")}
                    </div>
                    {form.getValues("companyName") && (
                      <div>{form.getValues("companyName")}</div>
                    )}
                    <div className="whitespace-pre-line">
                      {form.getValues("billingAddress")}
                    </div>
                    <div className="mt-2">{form.getValues("email")}</div>
                    <div>{form.getValues("phone")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-500 mb-1">
                      From:
                    </div>
                    <div className="font-bold">Humai Webs</div>
                    <div>Office 1A, IK Tower, MPCHS E-11/3</div>
                    <div>Islamabad Capital Territory 44810</div>
                    <div className="mt-2">info@humaiwebs.com</div>
                    <div>+1 234 567 8900</div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-8">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border-b">Description</th>
                        <th className="py-2 px-4 border-b">Service Type</th>
                        <th className="py-2 px-4 border-b">
                          {pricingMode === "hourly" ? "Hours" : "Qty"}
                        </th>
                        <th className="py-2 px-4 border-b">
                          {pricingMode === "hourly" ? "Rate/Hour" : "Rate"}
                        </th>
                        <th className="py-2 px-4 border-b text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-4">{item.description}</td>
                          <td className="py-2 px-4">{item.serviceType}</td>
                          <td className="py-2 px-4">{item.quantity}</td>
                          <td className="py-2 px-4">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payment Summary */}
                <div className="flex justify-end mb-8">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <div>Subtotal:</div>
                      <div>{formatCurrency(subtotal)}</div>
                    </div>
                    {watchTaxRate > 0 && (
                      <div className="flex justify-between py-2">
                        <div>Tax ({watchTaxRate}%):</div>
                        <div>{formatCurrency(taxAmount)}</div>
                      </div>
                    )}
                    {watchDiscount > 0 && (
                      <div className="flex justify-between py-2">
                        <div>Discount ({watchDiscount}%):</div>
                        <div>-{formatCurrency(discountAmount)}</div>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t border-b">
                      <div>Total:</div>
                      <div>{formatCurrency(total)}</div>
                    </div>
                    <div className="flex justify-between py-2">
                      <div>Amount Paid:</div>
                      <div>
                        {formatCurrency(Number(form.getValues("paidAmount")))}
                      </div>
                    </div>
                    <div className="flex justify-between py-2 font-bold text-[#005587]">
                      <div>Balance Due:</div>
                      <div>{formatCurrency(balanceDue)}</div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {form.getValues("notes") && (
                  <div className="mb-8">
                    <div className="font-semibold mb-2">Notes:</div>
                    <div className="text-gray-600 whitespace-pre-line">
                      {form.getValues("notes")}
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                <div className="mb-8">
                  <div className="font-semibold mb-2">Payment Information:</div>
                  <div className="text-gray-600">
                    <div>Account Title: HumAi Online Marketing</div>
                    <div>Account Number: 1916290092222</div>
                    <div>IBAN: PK09UNIL0109000290092222</div>
                    <div>Bank: United Bank Limited</div>
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="text-center text-gray-500 text-sm mt-8">
                  <div className="mb-2">
                    Payment Terms: {form.getValues("paymentTerms")}
                  </div>
                  <div>Thank you for your business!</div>
                </div>
              </div>

              {/* Action Buttons - Prominently displayed after the preview */}
              <div className="flex flex-wrap justify-center gap-4 mt-8 mb-8 no-print">
                <Button
                  type="button"
                  className="bg-[#005587] hover:bg-[#004570] px-6 py-2 text-lg"
                  onClick={form.handleSubmit(onSubmit)}>
                  <Save className="h-5 w-5 mr-2" />
                  Save Invoice
                </Button>
                <Button
                  type="button"
                  className="bg-[#005587] hover:bg-[#004570] px-6 py-2 text-lg"
                  onClick={generatePDF}>
                  <Download className="h-5 w-5 mr-2" />
                  Download PDF
                </Button>
                <Button
                  type="button"
                  className="bg-[#005587] hover:bg-[#004570] px-6 py-2 text-lg"
                  onClick={emailInvoice}>
                  <Mail className="h-5 w-5 mr-2" />
                  Email Invoice
                </Button>
                <Button
                  type="button"
                  className="bg-[#005587] hover:bg-[#004570] px-6 py-2 text-lg"
                  onClick={() => window.print()}>
                  <Printer className="h-5 w-5 mr-2" />
                  Print
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
