import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer not found');
    }

    const repositoryProducts = await this.productsRepository.findAllById(
      products,
    );
    if (products.length !== repositoryProducts.length) {
      throw new AppError('Some product of the list was not found');
    }

    const orderProducts = repositoryProducts.map(product => {
      const productInList = products.find(
        requestProduct => requestProduct.id === product.id,
      );
      const quantity = productInList?.quantity || 0;
      if (quantity < 1) {
        throw new AppError(
          `Please inform a valid quantity to product (${product.name})`,
        );
      }
      if (quantity > product.quantity) {
        throw new AppError(
          `Product (${product.name}) with insufficient quantity`,
        );
      }
      return {
        product_id: product.id,
        price: product.price,
        quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
